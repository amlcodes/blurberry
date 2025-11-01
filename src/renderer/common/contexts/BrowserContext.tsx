import { BrowserAPI, TabInfo } from "@preload/global.d";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface BrowserContextType {
  tabs: TabInfo[];
  activeTab: TabInfo | null;
  isLoading: boolean;
  isPanelVisible: boolean;

  // Tab management
  createTab: (url?: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  refreshTabs: () => Promise<void>;

  // Navigation
  navigateToUrl: (url: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  reload: () => Promise<void>;

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

  const createTab = useCallback(
    async (url?: string) => {
      setIsLoading(true);
      try {
        await api.createTab(url);
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
        console.log("[BrowserContext] Initial panel visibility:", isVisible);
        setIsPanelVisible(isVisible);
      })
      .catch(console.error);
  }, [api, refreshTabs]);

  // Listen for panel visibility changes
  useEffect(() => {
    const cleanup = api.onPanelVisibilityChanged((isVisible) => {
      console.log("[BrowserContext] Panel visibility changed to:", isVisible);
      setIsPanelVisible(isVisible);
    });
    return cleanup;
  }, [api]);

  // Periodic refresh to keep tabs in sync
  useEffect(() => {
    const interval = setInterval(() => void refreshTabs(), 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [refreshTabs]);

  const value: BrowserContextType = {
    tabs,
    activeTab,
    isLoading,
    isPanelVisible,
    createTab,
    closeTab,
    switchTab,
    refreshTabs,
    navigateToUrl,
    goBack,
    goForward,
    reload,
    takeScreenshot,
    runJavaScript,
    togglePanel,
  };

  return (
    <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>
  );
};
