import { useDarkMode } from "@renderer/hooks/useDarkMode";
import { Clock, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import React, { useEffect, useState } from "react";
import { Chat } from "./components/Chat";
import { History } from "./components/History";
import { ChatProvider } from "./contexts/ChatContext";

type PanelView = "chat" | "history";

const PanelContent: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const { isDarkMode } = useDarkMode();
  const [currentView, setCurrentView] = useState<PanelView>("chat");

  // Apply dark mode class to the document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <motion.div
      className="h-screen flex flex-col bg-background border-l border-border"
      initial={false}
      animate={{
        x: isVisible ? 0 : 400,
        opacity: isVisible ? 1 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 30,
        mass: 1,
      }}
    >
      {/* View switcher */}
      <div className="flex items-center border-b border-border bg-background/50">
        <button
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            currentView === "chat"
              ? "text-foreground bg-muted/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
          onClick={() => setCurrentView("chat")}
        >
          <MessageSquare className="size-4" />
          Chat
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            currentView === "history"
              ? "text-foreground bg-muted/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
          onClick={() => setCurrentView("history")}
        >
          <Clock className="size-4" />
          History
        </button>
      </div>

      {/* View content */}
      {currentView === "chat" ? <Chat /> : <History />}
    </motion.div>
  );
};

export const PanelApp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  // Initialize panel visibility on mount
  useEffect(() => {
    window.panelAPI
      .getPanelVisibility()
      .then((visible) => {
        setIsVisible(visible);
      })
      .catch(console.error);
  }, []);

  // Listen for panel visibility changes
  useEffect(() => {
    const cleanup = window.panelAPI.onPanelVisibilityChanged((visible) => {
      setIsVisible(visible);
    });
    return cleanup;
  }, []);

  return (
    <ChatProvider>
      <PanelContent isVisible={isVisible} />
    </ChatProvider>
  );
};
