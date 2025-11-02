import { Favicon } from "@renderer/components/Favicon";
import { useBrowser } from "@renderer/contexts/BrowserContext";
import { cn, getFavicon } from "@renderer/lib/utils";
import { RefreshCw, X } from "lucide-react";
import React, { useState } from "react";

export const SidebarAddressBar: React.FC = () => {
  const { activeTab, navigateToUrl, isLoading, reload, stop } = useBrowser();
  const [editedUrl, setEditedUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);

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
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Escape") {
      setIsFocused(false);
      (e.target as HTMLInputElement).blur();
    }
  };

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

  const handleRefreshOrStop = (): void => {
    if (isLoading) {
      void stop();
    } else {
      void reload();
    }
  };

  return (
    <div className="flex items-center gap-2 app-region-no-drag px-3">
      {/* Address Bar */}
      {isFocused ? (
        // Expanded State
        <form onSubmit={handleSubmit} className="flex-1 min-w-0">
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
            "flex-1 min-w-0 px-2 h-8 rounded-md cursor-text group/address-bar",
            "hover:bg-muted text-muted-foreground app-region-no-drag",
            "transition-colors duration-200",
            "dark:hover:bg-muted/50",
          )}
        >
          <div className="flex h-full items-center gap-2">
            {/* Favicon */}
            <div className="size-4 shrink-0">
              <Favicon
                src={activeTab?.url ? getFavicon(activeTab.url) : null}
              />
            </div>

            {/* URL Display */}
            <div className="text-xs leading-normal overflow-hidden flex-1 min-w-0">
              {activeTab ? (
                <div className="flex flex-col">
                  <span className="text-foreground dark:text-foreground truncate block">
                    {getDomain()}
                  </span>
                  <span className="text-muted-foreground/60 text-[0.7rem] truncate block group-hover/address-bar:hidden">
                    {activeTab.title || "New Tab"}
                  </span>
                  <span className="text-muted-foreground/60 text-[0.7rem] truncate hidden group-hover/address-bar:block">
                    {getPath()}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">No active tab</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refresh/Stop Button */}
      <button
        onClick={handleRefreshOrStop}
        disabled={!activeTab}
        className={cn(
          "shrink-0 size-8 flex items-center justify-center rounded-md",
          "transition-colors duration-200",
          activeTab && !isLoading
            ? "hover:bg-muted dark:hover:bg-muted/50 text-primary"
            : "",
          !activeTab && "opacity-50 cursor-not-allowed",
        )}
        title={isLoading ? "Stop loading" : "Reload"}
      >
        {isLoading ? (
          <X className="size-4" />
        ) : (
          <RefreshCw className="size-4" />
        )}
      </button>
    </div>
  );
};
