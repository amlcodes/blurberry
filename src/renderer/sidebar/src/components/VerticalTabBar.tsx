import { DarkModeToggle } from "@common/components/DarkModeToggle";
import { Favicon } from "@common/components/Favicon";
import { GroupModal } from "@common/components/GroupModal";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@common/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@common/components/ui/dropdown-menu";
import { useBrowser } from "@common/contexts/BrowserContext";
import { cn, getFavicon } from "@common/lib/utils";
import type { GroupInfo } from "@preload/global.d";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Ungroup,
  X,
} from "lucide-react";
import React from "react";

// Types for enhanced drag and drop
type DragItem =
  | { type: "tab"; id: string; groupId: string | null }
  | { type: "group"; id: string };

type DropZone = {
  type: "before" | "after" | "into-group";
  targetId: string; // tab id or group id
};

interface TabItemProps {
  id: string;
  title: string;
  favicon?: string | null;
  isActive: boolean;
  tab: { id: string; groupId: string | null };
  onClose: () => void;
  onActivate: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (
    e: React.DragEvent,
    id: string,
    position: "before" | "after",
  ) => void;
  isDragging: boolean;
  showDropBefore: boolean;
  showDropAfter: boolean;
  renderContextMenu: (tab: {
    id: string;
    groupId: string | null;
  }) => React.ReactNode;
}

const TabItem: React.FC<TabItemProps> = ({
  id,
  title,
  favicon,
  isActive,
  tab,
  onClose,
  onActivate,
  onDragStart,
  onDragOver,
  isDragging,
  showDropBefore,
  showDropAfter,
  renderContextMenu,
}) => {
  return (
    <div className="relative">
      {/* Drop indicator - Before/Above */}
      {showDropBefore && (
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" />
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            draggable
            onDragStart={(e) => onDragStart(e, id)}
            onDragOver={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const midpoint = rect.top + rect.height / 2;
              const position = e.clientY < midpoint ? "before" : "after";
              onDragOver(e, id, position);
            }}
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
              <span className="text-xs block truncate">
                {title || "New Tab"}
              </span>
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
        </ContextMenuTrigger>
        {renderContextMenu(tab)}
      </ContextMenu>

      {/* Drop indicator - After/Below */}
      {showDropAfter && (
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" />
      )}
    </div>
  );
};

interface GroupHeaderProps {
  group: GroupInfo;
  tabCount: number;
  onToggleCollapse: () => void;
  onDragStart: (e: React.DragEvent, groupId: string) => void;
  onDragOver: (
    e: React.DragEvent,
    groupId: string,
    position: "before" | "after" | "into",
  ) => void;
  isDragging: boolean;
  showDropBefore: boolean;
  showDropAfter: boolean;
  showDropInto: boolean;
  renderContextMenu: (group: GroupInfo) => React.ReactNode;
}

const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  tabCount,
  onToggleCollapse,
  onDragStart,
  onDragOver,
  isDragging,
  showDropBefore,
  showDropAfter,
  showDropInto,
  renderContextMenu,
}) => {
  return (
    <div className="relative">
      {/* Drop indicator - Before/Above */}
      {showDropBefore && (
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" />
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            draggable
            onDragStart={(e) => onDragStart(e, group.id)}
            onDragOver={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const topThird = rect.top + rect.height / 3;
              const bottomThird = rect.top + (rect.height * 2) / 3;

              let position: "before" | "after" | "into";
              if (e.clientY < topThird) {
                position = "before";
              } else if (e.clientY > bottomThird) {
                position = "after";
              } else {
                position = "into";
              }
              onDragOver(e, group.id, position);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 app-region-no-drag cursor-pointer hover:bg-muted/30 rounded-md mb-1",
              isDragging && "opacity-50",
              showDropInto && "ring-2 ring-blue-500",
            )}
            onClick={onToggleCollapse}
          >
            {group.isCollapsed ? (
              <ChevronRight className="size-3 shrink-0" />
            ) : (
              <ChevronDown className="size-3 shrink-0" />
            )}
            <div
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: group.color.hex }}
            />
            <span className="text-xs truncate flex-1">{group.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              ({tabCount})
            </span>
          </div>
        </ContextMenuTrigger>
        {renderContextMenu(group)}
      </ContextMenu>

      {/* Drop indicator - After/Below */}
      {showDropAfter && (
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" />
      )}
    </div>
  );
};

export const VerticalTabBar: React.FC = () => {
  const {
    tabs,
    groups,
    createTab,
    closeTab,
    switchTab,
    createGroup,
    updateGroup,
    deleteGroup,
    addTabToGroup,
    removeTabFromGroup,
    reorderGroups,
    updateTabPositions,
    organizeTabs,
    isOrganizing,
  } = useBrowser();
  const [draggedItem, setDraggedItem] = React.useState<DragItem | null>(null);
  const [dropZone, setDropZone] = React.useState<DropZone | null>(null);
  const [groupModal, setGroupModal] = React.useState<{
    isOpen: boolean;
    editingGroup?: GroupInfo;
    tabToAdd?: string;
  }>({ isOpen: false });

  const handleCreateTab = async (): Promise<void> => {
    await createTab("https://www.google.com");
  };

  // Handle tab drag start
  const handleTabDragStart = (e: React.DragEvent, tabId: string): void => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    setDraggedItem({ type: "tab", id: tabId, groupId: tab.groupId });
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle group drag start
  const handleGroupDragStart = (e: React.DragEvent, groupId: string): void => {
    setDraggedItem({ type: "group", id: groupId });
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over tab
  const handleTabDragOver = (
    e: React.DragEvent,
    targetTabId: string,
    position: "before" | "after",
  ): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!draggedItem) return;
    if (draggedItem.type === "tab" && draggedItem.id === targetTabId) return;

    setDropZone({ type: position, targetId: targetTabId });
  };

  // Handle drag over group
  const handleGroupDragOver = (
    e: React.DragEvent,
    targetGroupId: string,
    position: "before" | "after" | "into",
  ): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!draggedItem) return;
    if (draggedItem.type === "group" && draggedItem.id === targetGroupId)
      return;

    if (position === "into") {
      setDropZone({ type: "into-group", targetId: targetGroupId });
    } else {
      setDropZone({ type: position, targetId: targetGroupId });
    }
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault();

    if (!draggedItem || !dropZone) {
      setDraggedItem(null);
      setDropZone(null);
      return;
    }

    // Case 1: Dragging a tab
    if (draggedItem.type === "tab") {
      if (dropZone.type === "into-group") {
        // Add tab to group
        await addTabToGroup(draggedItem.id, dropZone.targetId);
      } else {
        // Reorder tabs
        const currentOrder = tabs.map((tab) => tab.id);
        const draggedIndex = currentOrder.indexOf(draggedItem.id);
        const targetIndex = currentOrder.indexOf(dropZone.targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const newOrder = [...currentOrder];
          newOrder.splice(draggedIndex, 1);

          const insertIndex =
            dropZone.type === "before" ? targetIndex : targetIndex + 1;
          newOrder.splice(
            draggedIndex < targetIndex ? insertIndex - 1 : insertIndex,
            0,
            draggedItem.id,
          );

          await updateTabPositions(newOrder);

          // Update group if needed
          const targetTab = tabs.find((t) => t.id === dropZone.targetId);
          if (targetTab && targetTab.groupId !== draggedItem.groupId) {
            if (targetTab.groupId) {
              await addTabToGroup(draggedItem.id, targetTab.groupId);
            } else {
              await removeTabFromGroup(draggedItem.id);
            }
          }
        }
      }
    }

    // Case 2: Dragging a group
    if (draggedItem.type === "group" && dropZone.type !== "into-group") {
      const currentOrder = groups.map((g) => g.id);
      const draggedIndex = currentOrder.indexOf(draggedItem.id);
      const targetIndex = currentOrder.indexOf(dropZone.targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);

        const insertIndex =
          dropZone.type === "before" ? targetIndex : targetIndex + 1;
        newOrder.splice(
          draggedIndex < targetIndex ? insertIndex - 1 : insertIndex,
          0,
          draggedItem.id,
        );

        await reorderGroups(newOrder);
      }
    }

    setDraggedItem(null);
    setDropZone(null);
  };

  const handleToggleCollapse = (groupId: string): void => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      void updateGroup(groupId, { isCollapsed: !group.isCollapsed });
    }
  };

  const handleCreateNewGroup = (tabId?: string): void => {
    setGroupModal({ isOpen: true, tabToAdd: tabId });
  };

  const handleEditGroup = (groupId: string): void => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setGroupModal({ isOpen: true, editingGroup: group });
    }
  };

  const handleSaveGroup = async (
    title: string,
    colorId: string,
  ): Promise<void> => {
    if (groupModal.editingGroup) {
      // Edit existing group
      await updateGroup(groupModal.editingGroup.id, { title, colorId });
    } else {
      // Create new group
      const newGroup = await createGroup(title, colorId);
      // If creating from tab context menu, add the tab to the group
      if (newGroup && groupModal.tabToAdd) {
        await addTabToGroup(groupModal.tabToAdd, newGroup.id);
      }
    }
    setGroupModal({ isOpen: false });
  };

  // Organize tabs by groups
  const ungroupedTabs = tabs.filter((tab) => !tab.groupId);
  const groupedTabs = groups.map((group) => ({
    group,
    tabs: tabs.filter((tab) => tab.groupId === group.id),
  }));

  // Render tab context menu
  const renderTabContextMenu = (tab: {
    id: string;
    groupId: string | null;
  }): React.ReactNode => {
    return (
      <ContextMenuContent className="w-48">
        {tab.groupId ? (
          <ContextMenuItem onClick={() => void removeTabFromGroup(tab.id)}>
            <Ungroup className="size-4 mr-2" />
            Remove from Group
          </ContextMenuItem>
        ) : (
          <>
            {groups.length > 0 && (
              <>
                <ContextMenuItem disabled>
                  <FolderPlus className="size-4 mr-2" />
                  Add to Group
                </ContextMenuItem>
                {groups.map((group) => (
                  <ContextMenuItem
                    key={group.id}
                    onClick={() => void addTabToGroup(tab.id, group.id)}
                    className="pl-8"
                  >
                    <div
                      className="size-3 rounded-full mr-2"
                      style={{ backgroundColor: group.color.hex }}
                    />
                    {group.title}
                  </ContextMenuItem>
                ))}
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => handleCreateNewGroup(tab.id)}>
              <Plus className="size-4 mr-2" />
              Create New Group
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    );
  };

  // Render group context menu
  const renderGroupContextMenu = (group: GroupInfo): React.ReactNode => {
    return (
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => handleEditGroup(group.id)}>
          <Pencil className="size-4 mr-2" />
          Rename Group
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleEditGroup(group.id)}>
          <Palette className="size-4 mr-2" />
          Change Color
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => void deleteGroup(group.id)} danger>
          <Trash2 className="size-4 mr-2" />
          Delete Group
        </ContextMenuItem>
      </ContextMenuContent>
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tabs */}
      <div
        className="flex-1 overflow-y-auto p-2 w-full"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Organize Tabs Button */}
        {ungroupedTabs.length >= 3 && (
          <div className="mb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer",
                    "hover:bg-muted/30 transition-colors",
                    isOrganizing && "opacity-50 cursor-not-allowed",
                  )}
                  disabled={isOrganizing}
                >
                  {isOrganizing ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Sparkles className="size-4 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {isOrganizing ? "Organizing..." : "Organize Tabs"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuItem
                  onClick={organizeTabs}
                  disabled={isOrganizing || ungroupedTabs.length < 3}
                >
                  <Sparkles className="size-4 mr-2" />
                  Organize by Topic
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Ungrouped tabs */}
        {ungroupedTabs.map((tab) => (
          <TabItem
            key={tab.id}
            id={tab.id}
            title={tab.title}
            favicon={getFavicon(tab.url)}
            isActive={tab.isActive}
            tab={tab}
            onClose={() => void closeTab(tab.id)}
            onActivate={() => void switchTab(tab.id)}
            onDragStart={handleTabDragStart}
            onDragOver={handleTabDragOver}
            isDragging={
              draggedItem?.type === "tab" && draggedItem.id === tab.id
            }
            showDropBefore={
              dropZone?.type === "before" && dropZone.targetId === tab.id
            }
            showDropAfter={
              dropZone?.type === "after" && dropZone.targetId === tab.id
            }
            renderContextMenu={renderTabContextMenu}
          />
        ))}

        {/* Grouped tabs */}
        {groupedTabs.map(
          ({ group, tabs: groupTabs }) =>
            groupTabs.length > 0 && (
              <div key={group.id} className="w-full">
                <GroupHeader
                  group={group}
                  tabCount={groupTabs.length}
                  onToggleCollapse={() => handleToggleCollapse(group.id)}
                  onDragStart={handleGroupDragStart}
                  onDragOver={handleGroupDragOver}
                  isDragging={
                    draggedItem?.type === "group" && draggedItem.id === group.id
                  }
                  showDropBefore={
                    dropZone?.type === "before" &&
                    dropZone.targetId === group.id
                  }
                  showDropAfter={
                    dropZone?.type === "after" && dropZone.targetId === group.id
                  }
                  showDropInto={
                    dropZone?.type === "into-group" &&
                    dropZone.targetId === group.id
                  }
                  renderContextMenu={renderGroupContextMenu}
                />
                {!group.isCollapsed &&
                  groupTabs.map((tab) => (
                    <TabItem
                      key={tab.id}
                      id={tab.id}
                      title={tab.title}
                      favicon={getFavicon(tab.url)}
                      isActive={tab.isActive}
                      tab={tab}
                      onClose={() => void closeTab(tab.id)}
                      onActivate={() => void switchTab(tab.id)}
                      onDragStart={handleTabDragStart}
                      onDragOver={handleTabDragOver}
                      isDragging={
                        draggedItem?.type === "tab" && draggedItem.id === tab.id
                      }
                      showDropBefore={
                        dropZone?.type === "before" &&
                        dropZone.targetId === tab.id
                      }
                      showDropAfter={
                        dropZone?.type === "after" &&
                        dropZone.targetId === tab.id
                      }
                      renderContextMenu={renderTabContextMenu}
                    />
                  ))}
              </div>
            ),
        )}

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

      {/* Group Modal */}
      <GroupModal
        isOpen={groupModal.isOpen}
        onClose={() => setGroupModal({ isOpen: false })}
        onSave={handleSaveGroup}
        existingGroup={groupModal.editingGroup}
        title={groupModal.editingGroup ? "Edit Group" : "Create New Group"}
      />
    </div>
  );
};
