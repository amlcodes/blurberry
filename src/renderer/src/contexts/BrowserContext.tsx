import { BrowserAPI, GroupInfo, TabInfo } from "@preload/global.d";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface BrowserContextType {
  tabs: TabInfo[];
  groups: GroupInfo[];
  activeTab: TabInfo | null;
  isLoading: boolean;
  isPanelVisible: boolean;

  // Tab management
  createTab: (url?: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  reorderTabs: (orderedTabIds: string[]) => Promise<void>;
  refreshTabs: () => Promise<void>;

  // Group management
  createGroup: (title: string, colorId?: string) => Promise<GroupInfo | null>;
  deleteGroup: (groupId: string) => Promise<void>;
  updateGroup: (
    groupId: string,
    updates: { title?: string; colorId?: string; isCollapsed?: boolean },
  ) => Promise<void>;
  addTabToGroup: (tabId: string, groupId: string) => Promise<void>;
  removeTabFromGroup: (tabId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;
  reorderGroups: (orderedGroupIds: string[]) => Promise<void>;
  updateTabPositions: (orderedTabIds: string[]) => Promise<void>;
  organizeTabs: () => Promise<void>;
  isOrganizing: boolean;

  // Navigation
  navigateToUrl: (url: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  reload: () => Promise<void>;
  stop: () => Promise<void>;

  // Tab actions
  takeScreenshot: (tabId: string) => Promise<string | null>;
  runJavaScript: (tabId: string, code: string) => Promise<void | null>;

  // Panel
  togglePanel: () => Promise<void>;
}

const BrowserContext = createContext<BrowserContextType | null>(null);

export const useBrowser = (): BrowserContextType => {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useBrowser must be used within a BrowserProvider");
  }
  return context;
};

interface BrowserProviderProps {
  children: React.ReactNode;
  api: BrowserAPI;
}

export const BrowserProvider: React.FC<BrowserProviderProps> = ({
  children,
  api,
}) => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  const activeTab = tabs.find((tab) => tab.isActive) || null;

  const refreshTabs = useCallback(async () => {
    try {
      const tabsData = await api.getTabs();
      setTabs(tabsData);
    } catch (error) {
      console.error("Failed to refresh tabs:", error);
    }
  }, [api]);

  const refreshGroups = useCallback(async () => {
    try {
      const groupsData = await api.getGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error("Failed to refresh groups:", error);
    }
  }, [api]);

  const createTab = useCallback(
    async (url?: string) => {
      setIsLoading(true);
      try {
        const newTab = await api.createTab(url);
        if (newTab) {
          // Switch to the newly created tab
          await api.switchTab(newTab.id);
        }
        await refreshTabs();
      } catch (error) {
        console.error("Failed to create tab:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [api, refreshTabs],
  );

  const closeTab = useCallback(
    async (tabId: string) => {
      setIsLoading(true);
      try {
        await api.closeTab(tabId);
        await refreshTabs();
      } catch (error) {
        console.error("Failed to close tab:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [api, refreshTabs],
  );

  const switchTab = useCallback(
    async (tabId: string) => {
      setIsLoading(true);
      try {
        await api.switchTab(tabId);
        await refreshTabs();
      } catch (error) {
        console.error("Failed to switch tab:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [api, refreshTabs],
  );

  const reorderTabs = useCallback(
    async (orderedTabIds: string[]) => {
      try {
        await api.reorderTabs(orderedTabIds);
        await refreshTabs();
      } catch (error) {
        console.error("Failed to reorder tabs:", error);
      }
    },
    [api, refreshTabs],
  );

  const navigateToUrl = useCallback(
    async (url: string) => {
      if (!activeTab) return;

      setIsLoading(true);
      try {
        await api.navigateTab(activeTab.id, url);
        // Wait a bit for navigation to start, then refresh tabs to get updated URL
        setTimeout(() => void refreshTabs(), 500);
      } catch (error) {
        console.error("Failed to navigate:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, api, refreshTabs],
  );

  const goBack = useCallback(async () => {
    if (!activeTab) return;

    try {
      await api.goBack(activeTab.id);
      setTimeout(() => void refreshTabs(), 500);
    } catch (error) {
      console.error("Failed to go back:", error);
    }
  }, [activeTab, api, refreshTabs]);

  const goForward = useCallback(async () => {
    if (!activeTab) return;

    try {
      await api.goForward(activeTab.id);
      setTimeout(() => void refreshTabs(), 500);
    } catch (error) {
      console.error("Failed to go forward:", error);
    }
  }, [activeTab, api, refreshTabs]);

  const reload = useCallback(async () => {
    if (!activeTab) return;

    try {
      await api.reload(activeTab.id);
      setTimeout(() => void refreshTabs(), 500);
    } catch (error) {
      console.error("Failed to reload:", error);
    }
  }, [activeTab, api, refreshTabs]);

  const stop = useCallback(async () => {
    if (!activeTab) return;

    try {
      await api.stop(activeTab.id);
    } catch (error) {
      console.error("Failed to stop:", error);
    }
  }, [activeTab, api]);

  const takeScreenshot = useCallback(
    async (tabId: string) => {
      try {
        return await api.tabScreenshot(tabId);
      } catch (error) {
        console.error("Failed to take screenshot:", error);
        return null;
      }
    },
    [api],
  );

  const runJavaScript = useCallback(
    async (tabId: string, code: string) => {
      try {
        return void (await api.tabRunJs(tabId, code));
      } catch (error) {
        console.error("Failed to run JavaScript:", error);
        return null;
      }
    },
    [api],
  );

  const togglePanel = useCallback(async () => {
    try {
      const newVisibility = await api.togglePanel();
      setIsPanelVisible(newVisibility);
    } catch (error) {
      console.error("Failed to toggle panel:", error);
    }
  }, [api]);

  // Initialize tabs and panel visibility on mount
  useEffect(() => {
    void refreshTabs();
    // Get initial panel visibility state
    api
      .getPanelVisibility()
      .then((isVisible) => {
        setIsPanelVisible(isVisible);
      })
      .catch(console.error);
  }, [api, refreshTabs]);

  // Group management
  const createGroup = useCallback(
    async (title: string, colorId?: string): Promise<GroupInfo | null> => {
      try {
        const newGroup = await api.createGroup(title, colorId);
        await refreshGroups();
        return newGroup;
      } catch (error) {
        console.error("Failed to create group:", error);
        return null;
      }
    },
    [api, refreshGroups],
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      try {
        await api.deleteGroup(groupId);
        await refreshGroups();
        await refreshTabs(); // Refresh tabs to update their groupId
      } catch (error) {
        console.error("Failed to delete group:", error);
      }
    },
    [api, refreshGroups, refreshTabs],
  );

  const updateGroup = useCallback(
    async (
      groupId: string,
      updates: { title?: string; colorId?: string; isCollapsed?: boolean },
    ) => {
      try {
        await api.updateGroup(groupId, updates);
        await refreshGroups();
      } catch (error) {
        console.error("Failed to update group:", error);
      }
    },
    [api, refreshGroups],
  );

  const addTabToGroup = useCallback(
    async (tabId: string, groupId: string) => {
      try {
        await api.addTabToGroup(tabId, groupId);
        await refreshTabs();
      } catch (error) {
        console.error("Failed to add tab to group:", error);
      }
    },
    [api, refreshTabs],
  );

  const removeTabFromGroup = useCallback(
    async (tabId: string) => {
      try {
        await api.removeTabFromGroup(tabId);
        await refreshTabs();
      } catch (error) {
        console.error("Failed to remove tab from group:", error);
      }
    },
    [api, refreshTabs],
  );

  const reorderGroups = useCallback(
    async (orderedGroupIds: string[]) => {
      try {
        await api.reorderGroups(orderedGroupIds);
        await refreshGroups();
      } catch (error) {
        console.error("Failed to reorder groups:", error);
      }
    },
    [api, refreshGroups],
  );

  const updateTabPositions = useCallback(
    async (orderedTabIds: string[]) => {
      try {
        await api.updateTabPositions(orderedTabIds);
        await refreshTabs();
      } catch (error) {
        console.error("Failed to update tab positions:", error);
      }
    },
    [api, refreshTabs],
  );

  const organizeTabs = useCallback(async () => {
    setIsOrganizing(true);
    try {
      const suggestions = await api.organizeTabs();

      for (const suggestion of suggestions) {
        const newGroup = await createGroup(
          suggestion.groupName,
          suggestion.colorId,
        );
        if (newGroup) {
          for (const tabId of suggestion.tabIds) {
            await addTabToGroup(tabId, newGroup.id);
          }
        }
      }

      await refreshTabs();
      await refreshGroups();
    } catch (error) {
      console.error("Failed to organize tabs:", error);
      alert(
        `Failed to organize tabs: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsOrganizing(false);
    }
  }, [api, createGroup, addTabToGroup, refreshTabs, refreshGroups]);

  // Listen for panel visibility changes
  useEffect(() => {
    const cleanup = api.onPanelVisibilityChanged((isVisible) => {
      setIsPanelVisible(isVisible);
    });
    return cleanup;
  }, [api]);

  // Periodic refresh to keep tabs and groups in sync
  useEffect(() => {
    const interval = setInterval(() => {
      void refreshTabs();
      void refreshGroups();
    }, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [refreshTabs, refreshGroups]);

  // Initial load
  useEffect(() => {
    void refreshGroups();
  }, [refreshGroups]);

  const value: BrowserContextType = {
    tabs,
    groups,
    activeTab,
    isLoading,
    isPanelVisible,
    createTab,
    closeTab,
    switchTab,
    reorderTabs,
    refreshTabs,
    createGroup,
    deleteGroup,
    updateGroup,
    addTabToGroup,
    removeTabFromGroup,
    refreshGroups,
    reorderGroups,
    updateTabPositions,
    organizeTabs,
    isOrganizing,
    navigateToUrl,
    goBack,
    goForward,
    reload,
    stop,
    takeScreenshot,
    runJavaScript,
    togglePanel,
  };

  return (
    <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>
  );
};
