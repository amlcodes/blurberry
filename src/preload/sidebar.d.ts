import { BrowserAPI, TabInfo } from "./global.d";

export type { TabInfo };

export interface SideBarAPI extends BrowserAPI {
  // Sidebar-specific methods
  resizeSidebar: (width: number) => Promise<boolean>;
  getSidebarWidth: () => Promise<number>;
}
