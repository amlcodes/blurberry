import { Favicon } from "@common/components/Favicon";
import { useBrowser } from "@common/contexts/BrowserContext";
import { cn, getFavicon } from "@common/lib/utils";
import { Plus, X } from "lucide-react";
import React from "react";
import { TabBarButton } from "../components/TabBarButton";

interface TabItemProps {
  id: string;
  title: string;
  favicon?: string | null;
  isActive: boolean;
  isPinned?: boolean;
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
  isPinned = false,
  onClose,
  onActivate,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}) => {
  const baseClassName = cn(
    "relative flex items-center h-8 pl-2 pr-1.5 select-none rounded-md",
    "text-primary group/tab transition-all duration-200 cursor-pointer",
    "app-region-no-drag", // Make tabs clickable
    isActive
      ? "bg-background shadow-tab dark:shadow-none"
      : "bg-transparent hover:bg-muted/50 dark:hover:bg-muted/30",
    isPinned ? "w-8 px-0! justify-center" : "",
  );

  return (
    <div className="py-1 px-0.5">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, id)}
        onDragOver={(e) => onDragOver(e, id)}
        onDrop={onDrop}
        className={baseClassName}
        onClick={() => !isActive && onActivate()}
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        {/* Favicon */}
        <div className={cn("size-4", !isPinned && "mr-2")}>
          <Favicon src={favicon} />
        </div>

        {/* Title (hide for pinned tabs) */}
        {!isPinned && (
          <span className="text-xs truncate max-w-[200px] flex-1">
            {title || "New Tab"}
          </span>
        )}

        {/* Close button (shows on hover) */}
        {!isPinned && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "shrink-0 p-1 rounded-md transition-opacity",
              "hover:bg-muted dark:hover:bg-muted/50",
              "opacity-0 group-hover/tab:opacity-100",
              isActive && "opacity-100",
            )}
          >
            <X className="size-3 text-primary dark:text-primary" />
          </div>
        )}
      </div>
    </div>
  );
};

export const TabBar: React.FC = () => {
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
    <div className="flex-1 overflow-x-hidden flex items-center">
      {/* macOS traffic lights spacing */}
      <div className="pl-20" />

      {/* Tabs */}
      <div className="flex-1 overflow-x-auto flex">
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
      </div>

      {/* Add Tab Button */}
      <div className="pl-1 pr-2">
        <TabBarButton Icon={Plus} onClick={() => void handleCreateTab()} />
      </div>
    </div>
  );
};
