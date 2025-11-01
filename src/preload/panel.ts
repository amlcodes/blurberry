import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge } from "electron";
import type { ChatRequest, ChatResponse } from "./panel.d";

// Panel specific APIs
const panelAPI = {
  // Chat functionality
  sendChatMessage: (request: Partial<ChatRequest>) =>
    electronAPI.ipcRenderer.invoke("panel-chat-message", request),

  clearChat: () => electronAPI.ipcRenderer.invoke("panel-clear-chat"),

  getMessages: () => electronAPI.ipcRenderer.invoke("panel-get-messages"),

  onChatResponse: (callback: (data: ChatResponse) => void) => {
    electronAPI.ipcRenderer.on("chat-response", (_, data) => callback(data));
  },

  onMessagesUpdated: (callback: (messages: any[]) => void) => {
    electronAPI.ipcRenderer.on("chat-messages-updated", (_, messages) =>
      callback(messages),
    );
  },

  removeChatResponseListener: () => {
    electronAPI.ipcRenderer.removeAllListeners("chat-response");
  },

  removeMessagesUpdatedListener: () => {
    electronAPI.ipcRenderer.removeAllListeners("chat-messages-updated");
  },

  // Page content access
  getPageContent: () => electronAPI.ipcRenderer.invoke("get-page-content"),
  getPageText: () => electronAPI.ipcRenderer.invoke("get-page-text"),
  getCurrentUrl: () => electronAPI.ipcRenderer.invoke("get-current-url"),

  // Tab information
  getActiveTabInfo: () => electronAPI.ipcRenderer.invoke("get-active-tab-info"),

  // Panel visibility
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
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("panelAPI", panelAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.panelAPI = panelAPI;
}
