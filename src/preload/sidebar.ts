import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge } from "electron";

// SideBar specific APIs (same as TopBar since they share functionality)
const sideBarAPI = {
  // Tab management
  createTab: (url?: string) =>
    electronAPI.ipcRenderer.invoke("create-tab", url),
  closeTab: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("close-tab", tabId),
  switchTab: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("switch-tab", tabId),
  reorderTabs: (orderedTabIds: string[]) =>
    electronAPI.ipcRenderer.invoke("reorder-tabs", orderedTabIds),
  getTabs: () => electronAPI.ipcRenderer.invoke("get-tabs"),

  // Group management
  createGroup: (title: string, colorId?: string) =>
    electronAPI.ipcRenderer.invoke("create-group", title, colorId),
  deleteGroup: (groupId: string) =>
    electronAPI.ipcRenderer.invoke("delete-group", groupId),
  updateGroup: (
    groupId: string,
    updates: { title?: string; colorId?: string; isCollapsed?: boolean },
  ) => electronAPI.ipcRenderer.invoke("update-group", groupId, updates),
  addTabToGroup: (tabId: string, groupId: string) =>
    electronAPI.ipcRenderer.invoke("add-tab-to-group", tabId, groupId),
  removeTabFromGroup: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("remove-tab-from-group", tabId),
  getGroups: () => electronAPI.ipcRenderer.invoke("get-groups"),
  reorderGroups: (orderedGroupIds: string[]) =>
    electronAPI.ipcRenderer.invoke("reorder-groups", orderedGroupIds),
  updateTabPositions: (orderedTabIds: string[]) =>
    electronAPI.ipcRenderer.invoke("update-tab-positions", orderedTabIds),
  organizeTabs: () => electronAPI.ipcRenderer.invoke("organize-tabs"),

  // Tab navigation
  navigateTab: (tabId: string, url: string) =>
    electronAPI.ipcRenderer.invoke("navigate-tab", tabId, url),
  goBack: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("tab-go-back", tabId),
  goForward: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("tab-go-forward", tabId),
  reload: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("tab-reload", tabId),
  stop: (tabId: string) => electronAPI.ipcRenderer.invoke("tab-stop", tabId),

  // Tab actions
  tabScreenshot: (tabId: string) =>
    electronAPI.ipcRenderer.invoke("tab-screenshot", tabId),
  tabRunJs: (tabId: string, code: string) =>
    electronAPI.ipcRenderer.invoke("tab-run-js", tabId, code),

  // Panel
  togglePanel: () => electronAPI.ipcRenderer.invoke("toggle-panel"),
  getPanelVisibility: () =>
    electronAPI.ipcRenderer.invoke("get-panel-visibility"),
  onPanelVisibilityChanged: (callback: (isVisible: boolean) => void) => {
    electronAPI.ipcRenderer.on(
      "panel-visibility-changed",
      (_, isVisible: boolean) => callback(isVisible),
    );
    // Return cleanup function
    return () => {
      electronAPI.ipcRenderer.removeAllListeners("panel-visibility-changed");
    };
  },

  // Sidebar
  resizeSidebar: (width: number) =>
    electronAPI.ipcRenderer.invoke("resize-sidebar", width),
  getSidebarWidth: () => electronAPI.ipcRenderer.invoke("get-sidebar-width"),

  // SideBar visibility (auto-hide)
  showBarTemporarily: () =>
    electronAPI.ipcRenderer.invoke("show-sidebar-temporarily"),
  hideBarTemporarily: () =>
    electronAPI.ipcRenderer.invoke("hide-sidebar-temporarily"),
  getBarVisibility: () =>
    electronAPI.ipcRenderer.invoke("get-sidebar-visibility"),
  toggleBarVisibility: () =>
    electronAPI.ipcRenderer.invoke("toggle-sidebar-visibility"),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("sideBarAPI", sideBarAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.sideBarAPI = sideBarAPI;
}
