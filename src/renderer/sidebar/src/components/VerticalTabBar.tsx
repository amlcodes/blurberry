import { Favicon } from "@common/components/Favicon";
import { useBrowser } from "@common/contexts/BrowserContext";
import { cn } from "@common/lib/utils";
import { Plus, X } from "lucide-react";
import React from "react";

interface TabItemProps {
  id: string;
  title: string;
  favicon?: string | null;
  isActive: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const TabItem: React.FC<TabItemProps> = ({
  title,
  favicon,
  isActive,
  onClose,
  onActivate,
}) => {
  const baseClassName = cn(
    "relative flex items-center h-10 w-full px-2 select-none rounded-md",
    "text-primary group/tab transition-all duration-200 cursor-pointer",
    "app-region-no-drag",
    isActive
      ? "bg-secondary shadow-subtle dark:bg-secondary dark:shadow-none"
      : "bg-transparent hover:bg-muted/50 dark:hover:bg-muted/30",
  );

  return (
    <div className="px-2 py-0.5">
      <div className={baseClassName} onClick={() => !isActive && onActivate()}>
        {/* Favicon */}
        <div className="shrink-0 mr-2">
          <Favicon src={favicon} />
        </div>

        {/* Title */}
        <span className="text-xs truncate flex-1 min-w-0">
          {title || "New Tab"}
        </span>

        {/* Close button (shows on hover or when active) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "shrink-0 p-1 rounded-md transition-opacity ml-1",
            "hover:bg-muted dark:hover:bg-muted/50",
            "opacity-0 group-hover/tab:opacity-100",
            isActive && "opacity-100",
          )}
        >
          <X className="size-3 text-primary dark:text-primary" />
        </div>
      </div>
    </div>
  );
};

export const VerticalTabBar: React.FC = () => {
  const { tabs, createTab, closeTab, switchTab } = useBrowser();

  const handleCreateTab = async (): Promise<void> => {
    await createTab("https://www.google.com");
  };

  // Extract favicon from URL (simplified - you might want to improve this)
  const getFavicon = (url: string): string | null => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-col h-full py-2">
      {/* Tabs */}
      <div className="flex-1 overflow-y-auto">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            id={tab.id}
            title={tab.title}
            favicon={getFavicon(tab.url)}
            isActive={tab.isActive}
            onClose={() => void closeTab(tab.id)}
            onActivate={() => void switchTab(tab.id)}
          />
        ))}
      </div>

      {/* Add Tab Button at bottom */}
      <div className="px-2 pt-2 border-t border-border dark:border-border">
        <button
          onClick={() => void handleCreateTab()}
          className={cn(
            "w-full h-10 flex items-center justify-center rounded-md",
            "bg-transparent hover:bg-muted/50 dark:hover:bg-muted/30",
            "transition-colors duration-200",
            "app-region-no-drag",
          )}
        >
          <Plus className="size-4 text-primary" />
        </button>
      </div>
    </div>
  );
};
