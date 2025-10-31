import { cn } from "@common/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  PanelRight,
  PanelRightClose,
  RefreshCw,
} from "lucide-react";
import React, { useState } from "react";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { Favicon } from "../components/Favicon";
import { ToolBarButton } from "../components/ToolBarButton";
import { useBrowser } from "../contexts/BrowserContext";

export const AddressBar: React.FC = () => {
  const {
    activeTab,
    navigateToUrl,
    goBack,
    goForward,
    reload,
    isLoading,
    isSidebarVisible,
    toggleSidebar,
  } = useBrowser();
  const [editedUrl, setEditedUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Debug log for sidebar visibility
  console.log("[AddressBar] isSidebarVisible:", isSidebarVisible);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!editedUrl.trim()) return;

    let finalUrl = editedUrl.trim();

    // Add protocol if missing
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      // Check if it looks like a domain
      if (finalUrl.includes(".") && !finalUrl.includes(" ")) {
        finalUrl = `https://${finalUrl}`;
      } else {
        // Treat as search query
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }

    void navigateToUrl(finalUrl);
    setIsFocused(false);
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleFocus = (): void => {
    // Copy current tab URL to editing state
    setEditedUrl(activeTab?.url || "");
    setIsFocused(true);
  };

  const handleBlur = (): void => {
    setIsFocused(false);
    // No need to reset - we switch back to showing activeTab.url automatically
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Escape") {
      setIsFocused(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  const canGoBack = activeTab !== null;
  const canGoForward = activeTab !== null;

  // Extract domain and title for display
  const getDomain = (): string => {
    if (!activeTab?.url) return "";
    try {
      const urlObj = new URL(activeTab.url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return activeTab.url;
    }
  };

  const getPath = (): string => {
    if (!activeTab?.url) return "";
    try {
      const urlObj = new URL(activeTab.url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      return "";
    }
  };

  const getFavicon = (): string | null => {
    if (!activeTab?.url) return null;
    try {
      const domain = new URL(activeTab.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  return (
    <>
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

      {/* Address Bar */}
      {isFocused ? (
        // Expanded State
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 max-w-full">
          <div className="bg-background rounded-lg shadow-md p-1 dark:bg-secondary">
            <input
              type="text"
              value={editedUrl}
              onChange={(e) => setEditedUrl(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full px-1 py-0.5 text-xs outline-hidden bg-transparent text-foreground truncate"
              placeholder={
                activeTab ? "Enter URL or search term" : "No active tab"
              }
              disabled={!activeTab}
              spellCheck={false}
              autoFocus
            />
          </div>
        </form>
      ) : (
        // Collapsed State
        <div
          onClick={handleFocus}
          className={cn(
            "flex-1 px-3 h-8 rounded-md cursor-text group/address-bar",
            "hover:bg-muted text-muted-foreground app-region-no-drag",
            "transition-colors duration-200",
            "dark:hover:bg-muted/50",
          )}
        >
          <div className="flex h-full items-center">
            {/* Favicon */}
            <div className="size-4 mr-2">
              <Favicon src={getFavicon()} />
            </div>

            {/* URL Display */}
            <div className="text-[0.8rem] leading-normal truncate flex-1">
              {activeTab ? (
                <>
                  <span className="text-foreground dark:text-foreground">
                    {getDomain()}
                  </span>
                  <span className="group-hover/address-bar:hidden text-muted-foreground/60">
                    {activeTab.title && ` / ${activeTab.title}`}
                  </span>
                  <span className="group-hover/address-bar:inline hidden text-muted-foreground/60">
                    {getPath()}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">No active tab</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions Menu */}
      <div className="flex items-center gap-1 app-region-no-drag">
        <DarkModeToggle />
        {/* Sidebar toggle button - shows different icon based on sidebar state */}
        <ToolBarButton
          Icon={isSidebarVisible ? PanelRightClose : PanelRight}
          onClick={() => void toggleSidebar()}
          toggled={isSidebarVisible}
        />
      </div>
    </>
  );
};
