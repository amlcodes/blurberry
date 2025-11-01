import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateObject, streamObject, type LanguageModel } from "ai";
import { z } from "zod";
import type {
  HistoryDatabase,
  Interaction,
  PageVisit,
} from "./database/HistoryDatabase";

// Workflow step schema
const WorkflowStepSchema = z.object({
  step_number: z.number().describe("Step number in the workflow"),
  action: z
    .string()
    .describe("Type of action: navigate, click, input, scroll, wait"),
  description: z.string().describe("Human-readable description of the step"),
  selector: z
    .string()
    .optional()
    .describe("CSS selector for the element (if applicable)"),
  value: z.string().optional().describe("Value to input (if applicable)"),
  url: z.string().optional().describe("URL to navigate to (if applicable)"),
  expected_outcome: z.string().describe("What should happen after this step"),
});

// Workflow schema for structured output
const WorkflowSchema = z.object({
  workflow_name: z.string().describe("Descriptive name for the workflow"),
  description: z
    .string()
    .describe("Brief description of what this workflow accomplishes"),
  steps: z.array(WorkflowStepSchema).describe("Array of steps in the workflow"),
  repeatability_score: z
    .number()
    .min(0)
    .max(100)
    .describe("How repeatable this workflow is (0-100)"),
  automation_potential: z
    .enum(["low", "medium", "high"])
    .describe("Potential for automation"),
  tags: z.array(z.string()).describe("Tags categorizing this workflow"),
  error_handling: z
    .array(z.string())
    .describe("Potential errors and how to handle them"),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export class WorkflowAnalyzer {
  private database: HistoryDatabase;
  private model: LanguageModel | null;
  private provider: "openai" | "anthropic";

  constructor(database: HistoryDatabase) {
    this.database = database;
    this.provider = this.getProvider();
    this.model = this.initializeModel();
  }

  private getProvider(): "openai" | "anthropic" {
    const provider = process.env.LLM_PROVIDER?.toLowerCase();
    if (provider === "anthropic") return "anthropic";
    return "openai";
  }

  private initializeModel(): LanguageModel | null {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const modelName =
      process.env.LLM_MODEL ||
      (this.provider === "anthropic"
        ? "claude-3-5-sonnet-20241022"
        : "gpt-4o-mini");

    switch (this.provider) {
      case "anthropic":
        return anthropic(modelName);
      case "openai":
        return openai(modelName);
      default:
        return null;
    }
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

  // Analyze a session and detect workflows
  async analyzeSession(sessionId: number): Promise<Workflow> {
    if (!this.model) {
      throw new Error("LLM model not initialized");
    }

    const sessionData = this.database.getSessionHistory(sessionId);
    if (!sessionData.session) {
      throw new Error("Session not found");
    }

    // Build context from session data
    const context = await this.buildSessionContext(sessionData);

    // Use generateObject for structured workflow detection
    const result = await generateObject({
      model: this.model,
      schema: WorkflowSchema,
      prompt: this.buildAnalysisPrompt(context),
      temperature: 0.3,
    });

    // Cache the result
    this.database.cacheWorkflow(sessionId, JSON.stringify(result.object));

    return result.object;
  }

  // Analyze recent history and detect patterns
  async analyzeRecentHistory(limitVisits: number = 50): Promise<Workflow> {
    if (!this.model) {
      throw new Error("LLM model not initialized");
    }

    const visits = this.database.getRecentHistory(limitVisits);
    if (visits.length === 0) {
      throw new Error("No history to analyze");
    }

    // Build context from recent visits
    const context = await this.buildVisitsContext(visits);

    // Use generateObject for structured workflow detection
    const result = await generateObject({
      model: this.model,
      schema: WorkflowSchema,
      prompt: this.buildAnalysisPrompt(context),
      temperature: 0.3,
    });

    return result.object;
  }

  // Stream workflow analysis (for real-time UI feedback)
  async *streamWorkflowAnalysis(
    sessionId: number,
  ): AsyncGenerator<unknown, void, unknown> {
    if (!this.model) {
      throw new Error("LLM model not initialized");
    }

    const sessionData = this.database.getSessionHistory(sessionId);
    if (!sessionData.session) {
      throw new Error("Session not found");
    }

    // Build context from session data
    const context = await this.buildSessionContext(sessionData);

    // Use streamObject for streaming structured output
    const result = streamObject({
      model: this.model,
      schema: WorkflowSchema,
      prompt: this.buildAnalysisPrompt(context),
      temperature: 0.3,
    });

    // Yield partial results as they stream in
    for await (const partialObject of result.partialObjectStream) {
      yield partialObject;
    }
  }

  // Build context from session data
  private async buildSessionContext(sessionData: {
    session: { id: number; start_time: number; end_time: number | null };
    visits: PageVisit[];
    tabEvents: Array<{
      id: number;
      session_id: number;
      tab_id: string;
      action: string;
      timestamp: number;
    }>;
  }): Promise<string> {
    const { session, visits, tabEvents } = sessionData;

    let context = `Session ID: ${session.id}\n`;
    context += `Duration: ${session.end_time ? Math.floor((session.end_time - session.start_time) / 1000) : "ongoing"} seconds\n\n`;
    context += `# Page Visits (${visits.length})\n\n`;

    for (const visit of visits) {
      context += `## ${visit.title}\n`;
      context += `URL: ${visit.url}\n`;
      context += `Duration: ${visit.duration ? Math.floor(visit.duration / 1000) : "unknown"} seconds\n`;

      // Get interactions for this visit
      const interactions = this.database.getVisitInteractions(visit.id);
      if (interactions.length > 0) {
        context += `Interactions: ${interactions.length}\n`;

        // Group interactions by type
        const interactionsByType = interactions.reduce(
          (acc, interaction) => {
            if (!acc[interaction.type]) {
              acc[interaction.type] = [];
            }
            acc[interaction.type].push(interaction);
            return acc;
          },
          {} as Record<string, Interaction[]>,
        );

        for (const [type, typeInteractions] of Object.entries(
          interactionsByType,
        )) {
          context += `  - ${type}: ${typeInteractions.length} (`;
          const selectors = typeInteractions
            .filter((i) => i.selector)
            .map((i) => i.selector)
            .slice(0, 3);
          if (selectors.length > 0) {
            context += `examples: ${selectors.join(", ")}`;
          }
          context += `)\n`;
        }
      }

      context += `\n`;
    }

    // Add tab events for context
    if (tabEvents.length > 0) {
      context += `\n# Tab Events\n`;
      tabEvents.forEach((event) => {
        context += `- ${event.action} tab ${event.tab_id}\n`;
      });
    }

    return context;
  }

  // Build context from visits
  private async buildVisitsContext(visits: PageVisit[]): Promise<string> {
    let context = `# Recent Browsing Activity (${visits.length} visits)\n\n`;

    for (const visit of visits) {
      context += `## ${visit.title}\n`;
      context += `URL: ${visit.url}\n`;
      context += `Duration: ${visit.duration ? Math.floor(visit.duration / 1000) : "unknown"} seconds\n`;

      // Get interactions for this visit
      const interactions = this.database.getVisitInteractions(visit.id);
      if (interactions.length > 0) {
        context += `Interactions: ${interactions.length}\n`;

        // Group interactions by type
        const interactionsByType = interactions.reduce(
          (acc, interaction) => {
            if (!acc[interaction.type]) {
              acc[interaction.type] = [];
            }
            acc[interaction.type].push(interaction);
            return acc;
          },
          {} as Record<string, Interaction[]>,
        );

        for (const [type, typeInteractions] of Object.entries(
          interactionsByType,
        )) {
          context += `  - ${type}: ${typeInteractions.length}\n`;
        }
      }

      context += `\n`;
    }

    return context;
  }

  // Build analysis prompt
  private buildAnalysisPrompt(context: string): string {
    return `You are an expert at analyzing browsing behavior and identifying repeatable workflows. 

Analyze the following browsing session and identify a repeatable workflow that could be automated:

${context}

Your task:
1. Identify the main workflow or task the user was performing
2. Break down the workflow into clear, actionable steps
3. For each step, specify:
   - The action type (navigate, click, input, scroll, wait)
   - A clear description
   - CSS selector (if clicking or inputting)
   - Expected outcome
4. Assess how repeatable and automatable this workflow is
5. Identify potential errors and how to handle them

Focus on:
- Common patterns across multiple page visits
- Sequences of interactions that form a coherent task
- Actions that could be automated (form filling, navigation, data extraction)
- Steps that are likely to be repeated in the future

Provide a structured workflow that could be used by an AI agent or automation tool.`;
  }

  // Generate export prompt for AI agents
  generateAgentPrompt(workflow: Workflow): string {
    let prompt = `# ${workflow.workflow_name}\n\n`;
    prompt += `${workflow.description}\n\n`;
    prompt += `**Repeatability Score:** ${workflow.repeatability_score}/100\n`;
    prompt += `**Automation Potential:** ${workflow.automation_potential}\n\n`;

    prompt += `## Steps\n\n`;
    for (const step of workflow.steps) {
      prompt += `### Step ${step.step_number}: ${step.description}\n\n`;
      prompt += `**Action:** ${step.action}\n`;

      if (step.url) {
        prompt += `**URL:** ${step.url}\n`;
      }

      if (step.selector) {
        prompt += `**Selector:** \`${step.selector}\`\n`;
      }

      if (step.value) {
        prompt += `**Value:** ${step.value}\n`;
      }

      prompt += `**Expected Outcome:** ${step.expected_outcome}\n\n`;
    }

    if (workflow.error_handling.length > 0) {
      prompt += `## Error Handling\n\n`;
      for (const error of workflow.error_handling) {
        prompt += `- ${error}\n`;
      }
      prompt += `\n`;
    }

    if (workflow.tags.length > 0) {
      prompt += `## Tags\n\n`;
      prompt += workflow.tags.map((tag) => `\`${tag}\``).join(", ");
      prompt += `\n`;
    }

    return prompt;
  }

  // Generate Playwright script
  generatePlaywrightScript(workflow: Workflow): string {
    let script = `import { test, expect } from '@playwright/test';\n\n`;
    script += `test('${workflow.workflow_name}', async ({ page }) => {\n`;

    for (const step of workflow.steps) {
      script += `  // Step ${step.step_number}: ${step.description}\n`;

      switch (step.action) {
        case "navigate":
          if (step.url) {
            script += `  await page.goto('${step.url}');\n`;
          }
          break;
        case "click":
          if (step.selector) {
            script += `  await page.click('${step.selector}');\n`;
          }
          break;
        case "input":
          if (step.selector && step.value) {
            script += `  await page.fill('${step.selector}', '${step.value}');\n`;
          }
          break;
        case "scroll":
          script += `  await page.evaluate(() => window.scrollBy(0, 500));\n`;
          break;
        case "wait":
          script += `  await page.waitForTimeout(1000);\n`;
          break;
      }

      script += `\n`;
    }

    script += `});\n`;
    return script;
  }

  // Get cached workflow for a session
  getCachedWorkflow(sessionId: number): Workflow | null {
    const cache = this.database.getWorkflowCache(sessionId);
    if (cache) {
      try {
        return JSON.parse(cache.workflow_data);
      } catch {
        return null;
      }
    }
    return null;
  }
}
