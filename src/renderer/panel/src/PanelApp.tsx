import { useDarkMode } from "@common/hooks/useDarkMode";
import { motion } from "motion/react";
import React, { useEffect, useState } from "react";
import { Chat } from "./components/Chat";
import { ChatProvider } from "./contexts/ChatContext";

const PanelContent: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const { isDarkMode } = useDarkMode();

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
      <Chat />
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
