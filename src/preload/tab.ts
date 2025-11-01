import { contextBridge, ipcRenderer } from "electron";

// Custom APIs for renderer
const api = {
  trackInteraction: (data: {
    visitId: number;
    type: "click" | "input" | "scroll" | "select" | "clipboard" | "keypress";
    selector?: string;
    value?: string;
    x?: number;
    y?: number;
    timestamp: number;
  }) => {
    ipcRenderer.send("history-track-interaction", data);
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electronAPI", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api;
}
