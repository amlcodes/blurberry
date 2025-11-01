import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  embedMany,
  generateId,
  generateText,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { WebContents } from "electron";
import type { Window } from "./Window";

import type { ChatRequest } from "../preload/panel.d";

interface StreamChunk {
  content: string;
  isComplete: boolean;
}

type LLMProvider = "openai" | "anthropic";

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
};

const MAX_CONTEXT_LENGTH = 4000;
const DEFAULT_TEMPERATURE = 0.7;

export class LLMClient {
  private readonly webContents: WebContents;
  private window: Window | null = null;
  private readonly provider: LLMProvider;
  private readonly modelName: string;
  private readonly model: LanguageModel | null;
  private readonly embeddingModel: ReturnType<typeof openai.embedding> | null;
  private messages: UIMessage[] = [];

  constructor(webContents: WebContents) {
    this.webContents = webContents;
    this.provider = this.getProvider();
    this.modelName = this.getModelName();
    this.model = this.initializeModel();
    this.embeddingModel = this.initializeEmbeddingModel();

    this.logInitializationStatus();
  }

  // Set the window reference after construction to avoid circular dependencies
  setWindow(window: Window): void {
    this.window = window;
  }

  private getProvider(): LLMProvider {
    const provider = process.env.LLM_PROVIDER?.toLowerCase();
    if (provider === "anthropic") return "anthropic";
    return "openai"; // Default to OpenAI
  }

  private getModelName(): string {
    return process.env.LLM_MODEL || DEFAULT_MODELS[this.provider];
  }

  private initializeModel(): LanguageModel | null {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    switch (this.provider) {
      case "anthropic":
        return anthropic(this.modelName);
      case "openai":
        return openai(this.modelName);
      default:
        return null;
    }
  }

  private initializeEmbeddingModel(): ReturnType<
    typeof openai.embedding
  > | null {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    // Always use OpenAI for embeddings as it's most reliable
    return openai.embedding("text-embedding-3-small");
  }

  private getApiKey(): string | undefined {
    switch (this.provider) {
      case "anthropic":
        return process.env.ANTHROPIC_API_KEY;
      case "openai":
        return process.env.OPENAI_API_KEY;
      default:
        return undefined;
    }
  }

  private logInitializationStatus(): void {
    if (this.model) {
      console.log(
        `✅ LLM Client initialized with ${this.provider} provider using model: ${this.modelName}`,
      );
    } else {
      const keyName =
        this.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
      console.error(
        `❌ LLM Client initialization failed: ${keyName} not found in environment variables.\n` +
          `Please add your API key to the .env.local file in the project root.`,
      );
    }
  }

  async sendChatMessage(request: ChatRequest): Promise<void> {
    try {
      // Get screenshot from active tab if available
      let screenshot: string | null = null;
      if (this.window) {
        const activeTab = this.window.activeTab;
        if (activeTab) {
          try {
            const image = await activeTab.screenshot();
            screenshot = image.toDataURL();
          } catch (error) {
            console.error("Failed to capture screenshot:", error);
          }
        }
      }

      // Build user message content with screenshot first, then text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userContent: any[] = [];

      // Add screenshot as the first part if available
      if (screenshot) {
        userContent.push({
          type: "image",
          image: screenshot,
        });
      }

      // Add text content
      userContent.push({
        type: "text",
        text: request.message,
      });

      // Create user message in UIMessage format
      const userMessage: UIMessage = {
        id: generateId(),
        role: "user",
        parts:
          userContent.length === 1
            ? [{ type: "text" as const, text: request.message }]
            : userContent,
      };

      this.messages.push(userMessage);

      // Send updated messages to renderer
      this.sendMessagesToRenderer();

      if (!this.model) {
        this.sendErrorMessage(
          request.messageId,
          "LLM service is not configured. Please add your API key to the .env file.",
        );
        return;
      }

      const messages = await this.prepareMessagesWithContext();
      await this.streamResponse(messages, request.messageId);
    } catch (error) {
      console.error("Error in LLM request:", error);
      this.handleStreamError(error, request.messageId);
    }
  }

  async organizeTabs(
    tabs: Array<{ id: string; title: string; url: string; content: string }>,
  ): Promise<Array<{ groupName: string; colorId: string; tabIds: string[] }>> {
    if (!this.model) {
      throw new Error("LLM not configured");
    }

    if (!this.embeddingModel) {
      throw new Error("Embedding model not configured");
    }

    // 1. Generate embeddings for each tab
    const tabTexts = tabs.map((t) => {
      try {
        const hostname = new URL(t.url).hostname;
        return `${t.title} | ${hostname} | ${t.content.substring(0, 1000)}`;
      } catch {
        return `${t.title} | ${t.content.substring(0, 1000)}`;
      }
    });

    const { embeddings } = await embedMany({
      model: this.embeddingModel,
      values: tabTexts,
    });

    // 2. Calculate similarity matrix and cluster
    const clusters = this.clusterBySimilarity(embeddings);

    // 3. Use LLM to generate group names and colors
    const prompt = this.buildOrganizationPrompt(clusters, tabs);
    const response = await generateText({
      model: this.model,
      prompt,
      temperature: 0.3,
    });

    // Parse JSON, removing markdown code blocks if present
    let jsonText = response.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }

    return JSON.parse(jsonText);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private clusterBySimilarity(embeddings: number[][]): number[][] {
    const SIMILARITY_THRESHOLD = 0.7;
    const visited = new Set<number>();
    const clusters: number[][] = [];

    for (let i = 0; i < embeddings.length; i++) {
      if (visited.has(i)) continue;

      const cluster = [i];
      visited.add(i);

      for (let j = i + 1; j < embeddings.length; j++) {
        if (visited.has(j)) continue;

        const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
        if (similarity > SIMILARITY_THRESHOLD) {
          cluster.push(j);
          visited.add(j);
        }
      }

      clusters.push(cluster);
    }

    // Limit to reasonable number of clusters (3-7)
    if (clusters.length > 7) {
      // Merge smallest clusters
      clusters.sort((a, b) => b.length - a.length);
      return clusters.slice(0, 7);
    }

    return clusters;
  }

  private buildOrganizationPrompt(
    clusters: number[][],
    tabs: Array<{ id: string; title: string; url: string; content: string }>,
  ): string {
    let prompt = `Analyze these browser tabs and organize them into topic-based groups.\n\nTABS:\n`;

    clusters.forEach((cluster, i) => {
      prompt += `\nCluster ${i + 1}:\n`;
      cluster.forEach((tabIndex) => {
        const tab = tabs[tabIndex];
        let hostname = "unknown";
        try {
          hostname = new URL(tab.url).hostname;
        } catch {
          // ignore
        }
        const snippet = tab.content.substring(0, 200).replace(/\n/g, " ");
        prompt += `- Tab "${tab.title}" (${hostname})\n`;
        prompt += `  ID: ${tab.id}\n`;
        if (snippet) {
          prompt += `  Content: ${snippet}...\n`;
        }
      });
    });

    prompt += `\nINSTRUCTIONS:
1. Name each cluster with a concise 2-3 word topic name
2. Assign an appropriate color from: gray, red, orange, yellow, green, cyan, blue, purple, pink
3. Group tabs by their semantic similarity and topic

Respond ONLY with a valid JSON array (no markdown code blocks):
[{"groupName": "Topic Name", "colorId": "blue", "tabIds": ["tab-1", "tab-2"]}]`;

    return prompt;
  }

  clearMessages(): void {
    this.messages = [];
    this.sendMessagesToRenderer();
  }

  getMessages(): UIMessage[] {
    return this.messages;
  }

  private sendMessagesToRenderer(): void {
    this.webContents.send("chat-messages-updated", this.messages);
  }

  private async prepareMessagesWithContext(): Promise<UIMessage[]> {
    // Get page context from active tab
    let pageUrl: string | null = null;
    let pageText: string | null = null;

    if (this.window) {
      const activeTab = this.window.activeTab;
      if (activeTab) {
        pageUrl = activeTab.url;
        try {
          pageText = await activeTab.getTabText();
        } catch (error) {
          console.error("Failed to get page text:", error);
        }
      }
    }

    // Build system message in UIMessage format
    const systemMessage: UIMessage = {
      id: generateId(),
      role: "system",
      parts: [
        {
          type: "text" as const,
          text: this.buildSystemPrompt(pageUrl, pageText),
        },
      ],
    };

    // Include all messages in history (system + conversation)
    return [systemMessage, ...this.messages];
  }

  private buildSystemPrompt(
    url: string | null,
    pageText: string | null,
  ): string {
    const parts: string[] = [
      "You are a helpful AI assistant integrated into a web browser.",
      "You can analyze and discuss web pages with the user.",
      "The user's messages may include screenshots of the current page as the first image.",
    ];

    if (url) {
      parts.push(`\nCurrent page URL: ${url}`);
    }

    if (pageText) {
      const truncatedText = this.truncateText(pageText, MAX_CONTEXT_LENGTH);
      parts.push(`\nPage content (text):\n${truncatedText}`);
    }

    parts.push(
      "\nPlease provide helpful, accurate, and contextual responses about the current webpage.",
      "If the user asks about specific content, refer to the page content and/or screenshot provided.",
    );

    return parts.join("\n");
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  private async streamResponse(
    messages: UIMessage[],
    messageId: string,
  ): Promise<void> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }

    // Convert UIMessage to ModelMessage for the language model
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model: this.model,
      messages: modelMessages,
      temperature: DEFAULT_TEMPERATURE,
      maxRetries: 3,
      abortSignal: undefined, // Could add abort controller for cancellation
    });

    await this.processStream(result.textStream, messageId);
  }

  private async processStream(
    textStream: AsyncIterable<string>,
    messageId: string,
  ): Promise<void> {
    let accumulatedText = "";

    // Create a placeholder assistant message in UIMessage format
    const assistantMessageId = generateId();
    const assistantMessage: UIMessage = {
      id: assistantMessageId,
      role: "assistant",
      parts: [{ type: "text" as const, text: "" }],
      metadata: {
        isStreaming: true,
      },
    };

    // Keep track of the index for updates
    const messageIndex = this.messages.length;
    this.messages.push(assistantMessage);

    for await (const chunk of textStream) {
      accumulatedText += chunk;

      // Update assistant message content (still streaming)
      this.messages[messageIndex] = {
        id: assistantMessageId,
        role: "assistant",
        parts: [{ type: "text" as const, text: accumulatedText }],
        metadata: {
          isStreaming: true,
        },
      };
      this.sendMessagesToRenderer();

      this.sendStreamChunk(messageId, {
        content: chunk,
        isComplete: false,
      });
    }

    // Final update with complete content (not streaming anymore)
    this.messages[messageIndex] = {
      id: assistantMessageId,
      role: "assistant",
      parts: [{ type: "text" as const, text: accumulatedText }],
      metadata: {
        isStreaming: false,
      },
    };
    this.sendMessagesToRenderer();

    // Send the final complete signal
    this.sendStreamChunk(messageId, {
      content: accumulatedText,
      isComplete: true,
    });
  }

  private handleStreamError(error: unknown, messageId: string): void {
    console.error("Error streaming from LLM:", error);

    const errorMessage = this.getErrorMessage(error);
    this.sendErrorMessage(messageId, errorMessage);
  }

  private getErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return "An unexpected error occurred. Please try again.";
    }

    const message = error.message.toLowerCase();

    if (message.includes("401") || message.includes("unauthorized")) {
      return "Authentication error: Please check your API key in the .env file.";
    }

    if (message.includes("429") || message.includes("rate limit")) {
      return "Rate limit exceeded. Please try again in a few moments.";
    }

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("econnrefused")
    ) {
      return "Network error: Please check your internet connection.";
    }

    if (message.includes("timeout")) {
      return "Request timeout: The service took too long to respond. Please try again.";
    }

    return "Sorry, I encountered an error while processing your request. Please try again.";
  }

  private sendErrorMessage(messageId: string, errorMessage: string): void {
    this.sendStreamChunk(messageId, {
      content: errorMessage,
      isComplete: true,
    });
  }

  private sendStreamChunk(messageId: string, chunk: StreamChunk): void {
    this.webContents.send("chat-response", {
      messageId,
      content: chunk.content,
      isComplete: chunk.isComplete,
    });
  }
}
