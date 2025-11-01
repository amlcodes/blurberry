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

  onMessagesUpdated: (callback: (messages: unknown[]) => void) => {
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

  // History API
  historyGetRecent: (limit?: number) =>
    electronAPI.ipcRenderer.invoke("history-get-recent", limit),
  historyGetByDateRange: (startTime: number, endTime: number) =>
    electronAPI.ipcRenderer.invoke(
      "history-get-by-date-range",
      startTime,
      endTime,
    ),
  historySearch: (query: string, limit?: number) =>
    electronAPI.ipcRenderer.invoke("history-search", query, limit),
  historyGetVisitDetails: (visitId: number) =>
    electronAPI.ipcRenderer.invoke("history-get-visit-details", visitId),
  historyGetInteractionCount: (visitId: number) =>
    electronAPI.ipcRenderer.invoke("history-get-interaction-count", visitId),
  historyGetSessions: () =>
    electronAPI.ipcRenderer.invoke("history-get-sessions"),
  historyGetSession: (sessionId: number) =>
    electronAPI.ipcRenderer.invoke("history-get-session", sessionId),
  historyGetCurrentSession: () =>
    electronAPI.ipcRenderer.invoke("history-get-current-session"),
  historyGetStats: () => electronAPI.ipcRenderer.invoke("history-get-stats"),
  historySettingsGet: () =>
    electronAPI.ipcRenderer.invoke("history-settings-get"),
  historySettingsUpdate: (config: Record<string, unknown>) =>
    electronAPI.ipcRenderer.invoke("history-settings-update", config),
  historyClearOld: (days: number) =>
    electronAPI.ipcRenderer.invoke("history-clear-old", days),

  // Workflow API
  workflowAnalyzeSession: (sessionId: number) =>
    electronAPI.ipcRenderer.invoke("workflow-analyze-session", sessionId),
  workflowAnalyzeRecent: (options?: { limit?: number }) =>
    electronAPI.ipcRenderer.invoke("workflow-analyze-recent", options),
  workflowGetCached: (sessionId: number) =>
    electronAPI.ipcRenderer.invoke("workflow-get-cached", sessionId),

  // Browser control
  browserOpenUrl: (url: string) =>
    electronAPI.ipcRenderer.invoke("browser-open-url", url),
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
