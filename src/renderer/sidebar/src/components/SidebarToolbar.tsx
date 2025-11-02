import { ToolBarButton } from "@renderer/components/ToolBarButton";
import { useBrowser } from "@renderer/contexts/BrowserContext";
import {
  ArrowLeft,
  ArrowRight,
  PanelRight,
  PanelRightClose,
} from "lucide-react";
import React from "react";
import { SidebarAddressBar } from "./SidebarAddressBar";

export const SidebarToolbar: React.FC = () => {
  const {
    activeTab,
    goBack,
    goForward,
    isLoading,
    isPanelVisible,
    togglePanel,
  } = useBrowser();

  const canGoBack = activeTab !== null;
  const canGoForward = activeTab !== null;

  return (
    <div className="flex flex-col gap-2 py-2 border-b border-border dark:border-border">
      {/* Traffic lights area with actions */}
      <div className="flex items-center h-8 app-region-drag">
        {/* Traffic lights spacer (72px to clear macOS traffic lights) */}
        <div className="w-[80px] shrink-0" />

        {/* Panel toggle - positioned right after traffic lights */}
        <div className="app-region-no-drag">
          <ToolBarButton
            Icon={isPanelVisible ? PanelRightClose : PanelRight}
            onClick={() => void togglePanel()}
            toggled={isPanelVisible}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-2" />

        {/* Navigation controls on the right */}
        <div className="flex gap-1.5 app-region-no-drag pr-3">
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
        </div>
      </div>

      {/* Address Bar with integrated Refresh/Stop */}
      <SidebarAddressBar />
    </div>
  );
};
