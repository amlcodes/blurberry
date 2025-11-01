import { DarkModeToggle } from "@common/components/DarkModeToggle";
import { ToolBarButton } from "@common/components/ToolBarButton";
import { useBrowser } from "@common/contexts/BrowserContext";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  PanelRight,
  PanelRightClose,
  RefreshCw,
} from "lucide-react";
import React from "react";

export const SidebarToolbar: React.FC = () => {
  const {
    activeTab,
    goBack,
    goForward,
    reload,
    isLoading,
    isPanelVisible,
    togglePanel,
  } = useBrowser();

  const canGoBack = activeTab !== null;
  const canGoForward = activeTab !== null;

  return (
    <div className="flex flex-col gap-2 px-2 py-2 border-b border-border dark:border-border">
      {/* Navigation Controls */}
      <div className="flex gap-1.5 app-region-no-drag">
        <ToolBarButton
          Icon={ArrowLeft}
          onClick={() => void goBack()}
          active={canGoBack && !isLoading}
        />
        <ToolBarButton
          Icon={ArrowRight}
          onClick={() => void goForward()}
          active={canGoForward && !isLoading}
        />
        <ToolBarButton
          onClick={() => void reload()}
          active={activeTab !== null && !isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4.5 animate-spin" />
          ) : (
            <RefreshCw className="size-4.5" />
          )}
        </ToolBarButton>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 app-region-no-drag">
        <DarkModeToggle />
        <ToolBarButton
          Icon={isPanelVisible ? PanelRightClose : PanelRight}
          onClick={() => void togglePanel()}
          toggled={isPanelVisible}
        />
      </div>
    </div>
  );
};
