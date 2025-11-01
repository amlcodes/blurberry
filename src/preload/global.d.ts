import { ElectronAPI } from "@electron-toolkit/preload";
import { SidebarAPI } from "./sidebar.d";
import { TopBarAPI } from "./topbar.d";

declare global {
  interface Window {
    electron: ElectronAPI;
    topBarAPI: TopBarAPI;
    sidebarAPI: SidebarAPI;
  }
}
