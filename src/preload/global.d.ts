import { ElectronAPI } from "@electron-toolkit/preload";
import { PanelAPI } from "./panel";
import { SideBarAPI } from "./sidebar.d";
import { TopBarAPI } from "./topbar.d";

// Shared types
export interface GroupColor {
  id: string;
  name: string;
  hex: string;
}

export interface GroupInfo {
  id: string;
  title: string;
  color: GroupColor;
  isCollapsed: boolean;
  position: number;
}

export interface TabInfo {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  groupId: string | null;
}

// Generic browser API interface (shared between topbar and sidebar)
export interface BrowserAPI {
  // Tab management
  createTab: (
    url?: string,
  ) => Promise<{ id: string; title: string; url: string } | null>;
  closeTab: (tabId: string) => Promise<boolean>;
  switchTab: (tabId: string) => Promise<boolean>;
  reorderTabs: (orderedTabIds: string[]) => Promise<boolean>;
  getTabs: () => Promise<TabInfo[]>;

  // Group management
  createGroup: (title: string, colorId?: string) => Promise<GroupInfo>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  updateGroup: (
    groupId: string,
    updates: { title?: string; colorId?: string; isCollapsed?: boolean },
  ) => Promise<boolean>;
  addTabToGroup: (tabId: string, groupId: string) => Promise<boolean>;
  removeTabFromGroup: (tabId: string) => Promise<boolean>;
  getGroups: () => Promise<GroupInfo[]>;
  reorderGroups: (orderedGroupIds: string[]) => Promise<boolean>;
  updateTabPositions: (orderedTabIds: string[]) => Promise<boolean>;
  organizeTabs: () => Promise<
    Array<{
      groupName: string;
      colorId: string;
      tabIds: string[];
    }>
  >;

  // Tab navigation
  navigateTab: (tabId: string, url: string) => Promise<void>;
  goBack: (tabId: string) => Promise<void>;
  goForward: (tabId: string) => Promise<void>;
  reload: (tabId: string) => Promise<void>;
  stop: (tabId: string) => Promise<void>;

  // Tab actions
  tabScreenshot: (tabId: string) => Promise<string | null>;
  tabRunJs: (tabId: string, code: string) => Promise<unknown>;

  // Panel
  togglePanel: () => Promise<boolean>;
  getPanelVisibility: () => Promise<boolean>;
  onPanelVisibilityChanged: (
    callback: (isVisible: boolean) => void,
  ) => () => void;

  // Auto-hide (for edge hover detection)
  showBarTemporarily?: () => Promise<void>;
  hideBarTemporarily?: () => Promise<void>;
  getBarVisibility?: () => Promise<boolean>;
  toggleBarVisibility?: () => Promise<boolean>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    topBarAPI: TopBarAPI;
    panelAPI: PanelAPI;
    sideBarAPI: SideBarAPI;
  }
}
