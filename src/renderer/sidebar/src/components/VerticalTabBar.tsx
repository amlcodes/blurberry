import { DarkModeToggle } from "@common/components/DarkModeToggle";
import { Favicon } from "@common/components/Favicon";
import { useBrowser } from "@common/contexts/BrowserContext";
import { cn, getFavicon } from "@common/lib/utils";
import { Plus, X } from "lucide-react";
import React from "react";

interface TabItemProps {
  id: string;
  title: string;
  favicon?: string | null;
  isActive: boolean;
  onClose: () => void;
  onActivate: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
}

const TabItem: React.FC<TabItemProps> = ({
  id,
  title,
  favicon,
  isActive,
  onClose,
  onActivate,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      onDragOver={(e) => onDragOver(e, id)}
      onDrop={onDrop}
      className={cn(
        "w-full",
        "relative flex items-center h-10 select-none rounded-md",
        "text-primary group/tab transition-all duration-200 cursor-pointer",
        "app-region-no-drag mb-1 gap-2 px-1",
        isActive
          ? "bg-secondary shadow-subtle dark:bg-secondary dark:shadow-none"
          : "bg-transparent hover:bg-muted/50 dark:hover:bg-muted/30",
        isDragging && "opacity-50",
      )}
      onClick={() => !isActive && onActivate()}
    >
      {/* Favicon */}
      <div className="shrink-0 size-5 mr-2">
        <Favicon src={favicon} />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <span className="text-xs block truncate">{title || "New Tab"}</span>
      </div>

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
  );
};

export const VerticalTabBar: React.FC = () => {
  const { tabs, createTab, closeTab, switchTab, reorderTabs } = useBrowser();
  const [draggedTabId, setDraggedTabId] = React.useState<string | null>(null);

  const handleCreateTab = async (): Promise<void> => {
    await createTab("https://www.google.com");
  };

  const handleDragStart = (e: React.DragEvent, tabId: string): void => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetTabId: string): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!draggedTabId || draggedTabId === targetTabId) return;

    // Get current order of tabs
    const currentOrder = tabs.map((tab) => tab.id);
    const draggedIndex = currentOrder.indexOf(draggedTabId);
    const targetIndex = currentOrder.indexOf(targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order by moving dragged tab to target position
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTabId);

    // Update order immediately for visual feedback
    void reorderTabs(newOrder);
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setDraggedTabId(null);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tabs */}
      <div className="flex-1 overflow-y-auto p-2 w-full">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            id={tab.id}
            title={tab.title}
            favicon={getFavicon(tab.url)}
            isActive={tab.isActive}
            onClose={() => void closeTab(tab.id)}
            onActivate={() => void switchTab(tab.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragging={draggedTabId === tab.id}
          />
        ))}

        {/* New Tab Button (styled as a tab item) */}
        <div
          onClick={() => void handleCreateTab()}
          className={cn(
            "w-full",
            "relative flex items-center h-10 select-none rounded-md",
            "text-primary group/tab transition-all duration-200 cursor-pointer",
            "app-region-no-drag mb-1 gap-2 px-1",
            "bg-transparent hover:bg-muted/50 dark:hover:bg-muted/30",
          )}
        >
          {/* Plus Icon */}
          <div className="shrink-0 size-5 mr-2 flex items-center justify-center">
            <Plus className="size-4 text-muted-foreground" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <span className="text-xs block truncate text-muted-foreground">
              New Tab
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar with Dark Mode Toggle */}
      <div className="pt-2 pb-2 px-2 border-t border-border dark:border-border flex justify-end">
        <div className="app-region-no-drag">
          <DarkModeToggle />
        </div>
      </div>
    </div>
  );
};
