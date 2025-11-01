import type { UIMessage } from "ai";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface ChatContextType {
  messages: UIMessage[];
  isLoading: boolean;

  // Chat actions
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;

  // Page content access
  getPageContent: () => Promise<string | null>;
  getPageText: () => Promise<string | null>;
  getCurrentUrl: () => Promise<string | null>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial messages from main process
  useEffect(() => {
    const loadMessages = async (): Promise<void> => {
      try {
        const storedMessages = await window.panelAPI.getMessages();
        if (storedMessages && storedMessages.length > 0) {
          // Messages are already in UIMessage format - no conversion needed!
          setMessages(storedMessages);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };
    void loadMessages();
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);

    try {
      const messageId = Date.now().toString();

      // Send message to main process (which will handle context)
      await window.panelAPI.sendChatMessage({
        message: content,
        context: {
          url: null,
          content: null,
          text: null,
        },
        messageId: messageId,
      });

      // Messages will be updated via the chat-messages-updated event
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(async () => {
    try {
      await window.panelAPI.clearChat();
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  }, []);

  const getPageContent = useCallback(async () => {
    try {
      return await window.panelAPI.getPageContent();
    } catch (error) {
      console.error("Failed to get page content:", error);
      return null;
    }
  }, []);

  const getPageText = useCallback(async () => {
    try {
      return await window.panelAPI.getPageText();
    } catch (error) {
      console.error("Failed to get page text:", error);
      return null;
    }
  }, []);

  const getCurrentUrl = useCallback(async () => {
    try {
      return await window.panelAPI.getCurrentUrl();
    } catch (error) {
      console.error("Failed to get current URL:", error);
      return null;
    }
  }, []);

  // Set up message listeners
  useEffect(() => {
    // Listen for streaming response updates
    const handleChatResponse = (data: {
      messageId: string;
      content: string;
      isComplete: boolean;
    }): void => {
      if (data.isComplete) {
        setIsLoading(false);
      }
    };

    // Listen for message updates from main process
    const handleMessagesUpdated = (updatedMessages: UIMessage[]): void => {
      // Messages are already in UIMessage format - no conversion needed!
      setMessages(updatedMessages);
    };

    window.panelAPI.onChatResponse(handleChatResponse);
    window.panelAPI.onMessagesUpdated(handleMessagesUpdated);

    return () => {
      window.panelAPI.removeChatResponseListener();
      window.panelAPI.removeMessagesUpdatedListener();
    };
  }, []);

  const value: ChatContextType = {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    getPageContent,
    getPageText,
    getCurrentUrl,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
