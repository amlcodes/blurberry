import { useDarkMode } from "@common/hooks/useDarkMode";
import { Moon, Sun } from "lucide-react";
import React from "react";
import { ToolBarButton } from "./ToolBarButton";

export const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <ToolBarButton
      Icon={isDarkMode ? Sun : Moon}
      onClick={toggleDarkMode}
      className="transition-transform"
    />
  );
};
