import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge } from "electron";

// TopBar specific APIs
const topBarAPI = {
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

  // TopBar visibility (auto-hide)
  showBarTemporarily: () =>
    electronAPI.ipcRenderer.invoke("show-topbar-temporarily"),
  hideBarTemporarily: () =>
    electronAPI.ipcRenderer.invoke("hide-topbar-temporarily"),
  getBarVisibility: () =>
    electronAPI.ipcRenderer.invoke("get-topbar-visibility"),
  toggleBarVisibility: () =>
    electronAPI.ipcRenderer.invoke("toggle-topbar-visibility"),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("topBarAPI", topBarAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.topBarAPI = topBarAPI;
}
