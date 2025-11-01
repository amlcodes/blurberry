import { BaseWindow, screen, shell } from "electron";
import { Group, GROUP_COLORS, GroupColor } from "./Group";
import type { LLMClient } from "./LLMClient";
import { Panel } from "./Panel";
import { SideBar } from "./SideBar";
import { Tab } from "./Tab";
import { TopBar } from "./TopBar";

type LayoutMode = "topbar" | "sidebar";

export class Window {
  private _baseWindow: BaseWindow;
  private tabsMap: Map<string, Tab> = new Map();
  private groupsMap: Map<string, Group> = new Map();
  private activeTabId: string | null = null;
  private tabCounter: number = 0;
  private groupCounter: number = 0;
  public readonly llmClient: LLMClient;
  private _topBar: TopBar | null = null;
  private _sideBar: SideBar | null = null;
  private _panel: Panel;
  private _layoutMode: LayoutMode = "topbar";
  private _isTopBarVisible: boolean = true;
  private _isSideBarVisible: boolean = true;
  private _edgeDetectionInterval: NodeJS.Timeout | null = null;
  private _hideTimeout: NodeJS.Timeout | null = null;
  private _isTemporarilyShowing: boolean = false;

  constructor() {
    // Create the browser window.
    this._baseWindow = new BaseWindow({
      width: 1000,
      height: 800,
      show: true,
      autoHideMenuBar: false,
      titleBarStyle: "hidden",
      ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
      trafficLightPosition: { x: 15, y: 13 },
    });

    this._baseWindow.setMinimumSize(1000, 800);

    // Initialize with topbar layout by default
    // Create panel first so it's behind the topbar/sidebar
    this._panel = new Panel(this._baseWindow);

    // Set panel layout mode to match initial layout
    this._panel.setLayoutMode(this._layoutMode);

    // Initialize and expose LLM client
    this.llmClient = this._panel.client;
    this.llmClient.setWindow(this);

    // Create topbar after panel so it appears on top
    this._topBar = new TopBar(this._baseWindow);

    // Create the first tab
    this.createTab();

    // Set up window resize handler
    this._baseWindow.on("resize", () => {
      this.updateTabBounds();
      if (this._topBar) this._topBar.updateBounds();
      if (this._sideBar) this._sideBar.updateBounds();
      this._panel.updateBounds();
      // Notify renderer of resize through active tab
      const bounds = this._baseWindow.getBounds();
      if (this.activeTab) {
        this.activeTab.webContents.send("window-resized", {
          width: bounds.width,
          height: bounds.height,
        });
      }
    });

    // Handle external link opening
    this.tabsMap.forEach((tab) => {
      tab.webContents.setWindowOpenHandler((details) => {
        void shell.openExternal(details.url);
        return { action: "deny" };
      });
    });

    this.setupEventListeners();
    this.startEdgeDetection();
  }

  private setupEventListeners(): void {
    this._baseWindow.on("closed", () => {
      // Clean up all tabs when window is closed
      this.tabsMap.forEach((tab) => tab.destroy());
      this.tabsMap.clear();
      // Stop edge detection
      if (this._edgeDetectionInterval) {
        clearInterval(this._edgeDetectionInterval);
      }
      if (this._hideTimeout) {
        clearTimeout(this._hideTimeout);
      }
    });
  }

  // Start monitoring mouse position for edge detection
  private startEdgeDetection(): void {
    // Check mouse position every 100ms
    this._edgeDetectionInterval = setInterval(() => {
      const mousePos = screen.getCursorScreenPoint();
      const windowBounds = this._baseWindow.getBounds();

      // Convert screen coordinates to window coordinates
      const relativeX = mousePos.x - windowBounds.x;
      const relativeY = mousePos.y - windowBounds.y;

      // Check if mouse is within window bounds
      const isInWindow =
        relativeX >= 0 &&
        relativeX <= windowBounds.width &&
        relativeY >= 0 &&
        relativeY <= windowBounds.height;

      if (!isInWindow) {
        // Mouse is outside window, hide if showing temporarily
        if (this._isTemporarilyShowing) {
          this.scheduleHide();
        }
        return;
      }

      const edgeThreshold = 10; // pixels from edge

      // Check for topbar reveal (top edge)
      if (
        this._layoutMode === "topbar" &&
        !this._isTopBarVisible &&
        relativeY <= edgeThreshold
      ) {
        this.revealBarTemporarily();
      }
      // Check for sidebar reveal (left edge)
      else if (
        this._layoutMode === "sidebar" &&
        !this._isSideBarVisible &&
        relativeX <= edgeThreshold
      ) {
        this.revealBarTemporarily();
      }
      // Mouse moved away from bar area
      else if (this._isTemporarilyShowing) {
        // Check if mouse left the bar area
        const leftBarArea =
          (this._layoutMode === "topbar" && relativeY > 88) ||
          (this._layoutMode === "sidebar" &&
            relativeX > (this._sideBar?.width || 240));

        if (leftBarArea) {
          this.scheduleHide();
        }
      }
    }, 100);
  }

  private revealBarTemporarily(): void {
    if (this._isTemporarilyShowing) return;

    this._isTemporarilyShowing = true;

    // Clear any pending hide timeout
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }

    // Show the appropriate bar
    if (this._layoutMode === "topbar" && this._topBar) {
      this._topBar.showTemporarily();
    } else if (this._layoutMode === "sidebar" && this._sideBar) {
      this._sideBar.showTemporarily();
    }
  }

  private scheduleHide(): void {
    if (!this._isTemporarilyShowing) return;

    // Clear any existing timeout
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
    }

    // Hide immediately when mouse leaves (no delay)
    this._hideTimeout = setTimeout(() => {
      this._isTemporarilyShowing = false;

      // Hide the appropriate bar
      if (this._layoutMode === "topbar" && this._topBar) {
        this._topBar.hideTemporarily();
      } else if (this._layoutMode === "sidebar" && this._sideBar) {
        this._sideBar.hideTemporarily();
      }

      this._hideTimeout = null;
    }, 50); // Very short delay (50ms) to prevent flickering
  }

  // Getters
  get window(): BaseWindow {
    return this._baseWindow;
  }

  get activeTab(): Tab | null {
    if (this.activeTabId) {
      return this.tabsMap.get(this.activeTabId) || null;
    }
    return null;
  }

  get allTabs(): Tab[] {
    return Array.from(this.tabsMap.values());
  }

  get tabCount(): number {
    return this.tabsMap.size;
  }

  // Tab management methods
  createTab(url?: string): Tab {
    const tabId = `tab-${++this.tabCounter}`;
    const tab = new Tab(tabId, url);

    // Set position to be at the end
    tab.position = this.tabsMap.size;

    // Add the tab's WebContentsView to the window (at bottom of z-order)
    this._baseWindow.contentView.addChildView(tab.view, 0);

    // Set the bounds based on layout mode
    this.setTabBounds(tab);

    // Store the tab
    this.tabsMap.set(tabId, tab);

    // If this is the first tab, make it active
    if (this.tabsMap.size === 1) {
      this.switchActiveTab(tabId);
    } else {
      // Hide the tab initially if it's not the first one
      tab.hide();
    }

    return tab;
  }

  // Helper to set tab bounds based on layout mode
  private setTabBounds(tab: Tab): void {
    const bounds = this._baseWindow.getBounds();
    const panelWidth = this._panel.getIsVisible() ? 400 : 0;

    if (this._layoutMode === "topbar") {
      // TopBar layout: tab starts below topbar (88px height) or top if hidden
      const topBarOffset = this._isTopBarVisible ? 88 : 0;
      tab.view.setBounds({
        x: 0,
        y: topBarOffset,
        width: bounds.width - panelWidth,
        height: bounds.height - topBarOffset,
      });
    } else {
      // Sidebar layout: tab starts to the right of sidebar or left edge if hidden
      const sidebarWidth = this._isSideBarVisible
        ? this._sideBar?.width || 240
        : 0;
      tab.view.setBounds({
        x: sidebarWidth,
        y: 0,
        width: bounds.width - sidebarWidth - panelWidth,
        height: bounds.height,
      });
    }
  }

  closeTab(tabId: string): boolean {
    const tab = this.tabsMap.get(tabId);
    if (!tab) {
      return false;
    }

    // Remove the WebContentsView from the window
    this._baseWindow.contentView.removeChildView(tab.view);

    // Destroy the tab
    tab.destroy();

    // Remove from our tabs map
    this.tabsMap.delete(tabId);

    // If this was the active tab, switch to another tab
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
      const remainingTabs = Array.from(this.tabsMap.keys());
      if (remainingTabs.length > 0) {
        this.switchActiveTab(remainingTabs[0]);
      }
    }

    // If no tabs left, close the window
    if (this.tabsMap.size === 0) {
      this._baseWindow.close();
    }

    return true;
  }

  switchActiveTab(tabId: string): boolean {
    const tab = this.tabsMap.get(tabId);
    if (!tab) {
      return false;
    }

    // Hide the currently active tab
    if (this.activeTabId && this.activeTabId !== tabId) {
      const currentTab = this.tabsMap.get(this.activeTabId);
      if (currentTab) {
        currentTab.hide();
      }
    }

    // Show the new active tab
    tab.show();
    this.activeTabId = tabId;

    // Update the window title to match the tab title
    this._baseWindow.setTitle(tab.title || "Blueberry Browser");

    return true;
  }

  getTab(tabId: string): Tab | null {
    return this.tabsMap.get(tabId) || null;
  }

  // Reorder tabs by providing new order of tab IDs
  reorderTabs(orderedTabIds: string[]): boolean {
    // Validate that all tab IDs exist
    const currentTabIds = new Set(this.tabsMap.keys());
    if (orderedTabIds.length !== currentTabIds.size) {
      return false;
    }

    for (const tabId of orderedTabIds) {
      if (!currentTabIds.has(tabId)) {
        return false;
      }
    }

    // Create new map with tabs in the new order
    const newTabsMap = new Map<string, Tab>();
    for (const tabId of orderedTabIds) {
      const tab = this.tabsMap.get(tabId);
      if (tab) {
        newTabsMap.set(tabId, tab);
      }
    }

    // Replace the old map with the new ordered map
    this.tabsMap = newTabsMap;

    return true;
  }

  // Group Management
  createGroup(title: string, colorId?: string): Group {
    const groupId = `group-${++this.groupCounter}`;
    const color = colorId
      ? GROUP_COLORS.find((c: GroupColor) => c.id === colorId) ||
        GROUP_COLORS[0]
      : GROUP_COLORS[0];

    // Set position to be at the end
    const position = this.groupsMap.size;
    const group = new Group(groupId, title, color, false, position);
    this.groupsMap.set(groupId, group);

    return group;
  }

  deleteGroup(groupId: string): boolean {
    const group = this.groupsMap.get(groupId);
    if (!group) {
      return false;
    }

    // Remove group from all tabs
    this.tabsMap.forEach((tab) => {
      if (tab.groupId === groupId) {
        tab.groupId = null;
      }
    });

    // Delete the group
    this.groupsMap.delete(groupId);

    return true;
  }

  updateGroup(
    groupId: string,
    updates: {
      title?: string;
      colorId?: string;
      isCollapsed?: boolean;
    },
  ): boolean {
    const group = this.groupsMap.get(groupId);
    if (!group) {
      return false;
    }

    if (updates.title !== undefined) {
      group.title = updates.title;
    }

    if (updates.colorId !== undefined) {
      const color = GROUP_COLORS.find(
        (c: GroupColor) => c.id === updates.colorId,
      );
      if (color) {
        group.color = color;
      }
    }

    if (updates.isCollapsed !== undefined) {
      group.isCollapsed = updates.isCollapsed;
    }

    return true;
  }

  addTabToGroup(tabId: string, groupId: string): boolean {
    const tab = this.tabsMap.get(tabId);
    const group = this.groupsMap.get(groupId);

    if (!tab || !group) {
      return false;
    }

    tab.groupId = groupId;
    return true;
  }

  removeTabFromGroup(tabId: string): boolean {
    const tab = this.tabsMap.get(tabId);
    if (!tab) {
      return false;
    }

    tab.groupId = null;
    return true;
  }

  getGroup(groupId: string): Group | null {
    return this.groupsMap.get(groupId) || null;
  }

  get allGroups(): Group[] {
    return Array.from(this.groupsMap.values()).sort(
      (a, b) => a.position - b.position,
    );
  }

  // Reorder groups by providing new order of group IDs
  reorderGroups(orderedGroupIds: string[]): boolean {
    // Validate that all group IDs exist
    const currentGroupIds = new Set(this.groupsMap.keys());
    if (orderedGroupIds.length !== currentGroupIds.size) {
      return false;
    }

    for (const groupId of orderedGroupIds) {
      if (!currentGroupIds.has(groupId)) {
        return false;
      }
    }

    // Update positions
    orderedGroupIds.forEach((groupId, index) => {
      const group = this.groupsMap.get(groupId);
      if (group) {
        group.position = index;
      }
    });

    return true;
  }

  // Update tab positions based on new order
  updateTabPositions(orderedTabIds: string[]): boolean {
    // Validate that all tab IDs exist
    const currentTabIds = new Set(this.tabsMap.keys());
    if (orderedTabIds.length !== currentTabIds.size) {
      return false;
    }

    for (const tabId of orderedTabIds) {
      if (!currentTabIds.has(tabId)) {
        return false;
      }
    }

    // Update positions
    orderedTabIds.forEach((tabId, index) => {
      const tab = this.tabsMap.get(tabId);
      if (tab) {
        tab.position = index;
      }
    });

    return true;
  }

  // Window methods
  show(): void {
    this._baseWindow.show();
  }

  hide(): void {
    this._baseWindow.hide();
  }

  close(): void {
    this._baseWindow.close();
  }

  focus(): void {
    this._baseWindow.focus();
  }

  minimize(): void {
    this._baseWindow.minimize();
  }

  maximize(): void {
    this._baseWindow.maximize();
  }

  unmaximize(): void {
    this._baseWindow.unmaximize();
  }

  isMaximized(): boolean {
    return this._baseWindow.isMaximized();
  }

  setTitle(title: string): void {
    this._baseWindow.setTitle(title);
  }

  setBounds(bounds: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }): void {
    this._baseWindow.setBounds(bounds);
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return this._baseWindow.getBounds();
  }

  // Handle window resize to update tab bounds
  private updateTabBounds(): void {
    this.tabsMap.forEach((tab) => {
      this.setTabBounds(tab);
    });
  }

  // Easing function for smooth animation (ease-out)
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // Animate tab width change smoothly
  private animateTabBounds(fromWidth: number, toWidth: number): void {
    const bounds = this._baseWindow.getBounds();
    const duration = 500; // Match panel animation duration
    const startTime = Date.now();

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
        // Final update to ensure exact target width
        this.updateTabBounds();
        return;
      }

      // Apply easing to progress
      const easedProgress = this.easeOutCubic(progress);
      const currentWidth = fromWidth + (toWidth - fromWidth) * easedProgress;

      this.tabsMap.forEach((tab) => {
        if (this._layoutMode === "topbar") {
          tab.view.setBounds({
            x: 0,
            y: 88,
            width: Math.round(currentWidth),
            height: bounds.height - 88,
          });
        } else {
          const sidebarWidth = this._sideBar?.width || 240;
          tab.view.setBounds({
            x: sidebarWidth,
            y: 0,
            width: Math.round(currentWidth),
            height: bounds.height,
          });
        }
      });

      // Use requestAnimationFrame-like behavior with setTimeout
      setTimeout(animate, 16); // ~60fps
    };

    animate();
  }

  // Public method to update all bounds when panel is toggled
  updateAllBounds(): void {
    const bounds = this._baseWindow.getBounds();
    const isVisible = this._panel.getIsVisible();

    // Calculate current and target widths based on layout
    const sidebarWidth = this._sideBar?.width || 240;
    const baseWidth =
      this._layoutMode === "topbar"
        ? bounds.width
        : bounds.width - sidebarWidth;
    const currentWidth = isVisible ? baseWidth : baseWidth - 400;
    const targetWidth = isVisible ? baseWidth - 400 : baseWidth;

    // Animate tab width change
    this.animateTabBounds(currentWidth, targetWidth);

    this._panel.updateBounds();
  }

  // Getter for panel to access from main process
  get panel(): Panel {
    return this._panel;
  }

  // Getter for topBar to access from main process
  get topBar(): TopBar | null {
    return this._topBar;
  }

  // Getter for sideBar to access from main process
  get sideBar(): SideBar | null {
    return this._sideBar;
  }

  // Getter for all tabs as array
  get tabs(): Tab[] {
    return Array.from(this.tabsMap.values());
  }

  // Getter for baseWindow to access from Menu
  get baseWindow(): BaseWindow {
    return this._baseWindow;
  }

  // Getter for layout mode
  get layoutMode(): LayoutMode {
    return this._layoutMode;
  }

  // Switch between topbar and sidebar layouts
  switchLayout(mode: LayoutMode): void {
    if (this._layoutMode === mode) return;

    this._layoutMode = mode;

    if (mode === "topbar") {
      // Switch to topbar layout
      if (this._sideBar) {
        this._sideBar.destroy();
        this._sideBar = null;
      }
      if (!this._topBar) {
        this._topBar = new TopBar(this._baseWindow);
      }
      // Ensure topbar visibility is set
      this._isTopBarVisible = true;
    } else {
      // Switch to sidebar layout
      if (this._topBar) {
        this._baseWindow.contentView.removeChildView(this._topBar.view);
        this._topBar = null;
      }
      if (!this._sideBar) {
        this._sideBar = new SideBar(this._baseWindow);
      }
      // Ensure sidebar visibility is set
      this._isSideBarVisible = true;
    }

    // Update panel layout mode
    this._panel.setLayoutMode(mode);

    // Update all bounds after layout switch
    // Use setTimeout to ensure the sidebar/topbar is fully initialized
    setTimeout(() => {
      this.updateTabBounds();
      this._panel.updateBounds();
    }, 0);
  }

  // Toggle between topbar and sidebar layouts
  toggleLayout(): void {
    const newMode = this._layoutMode === "topbar" ? "sidebar" : "topbar";
    this.switchLayout(newMode);
  }

  // Handle sidebar resize
  resizeSidebar(width: number): void {
    if (this._sideBar) {
      this._sideBar.setWidth(width);
      // Update all tab bounds to account for new sidebar width
      this.updateTabBounds();
    }
  }

  // Toggle topbar visibility
  toggleTopBarVisibility(): void {
    this._isTopBarVisible = !this._isTopBarVisible;
    this._isTemporarilyShowing = false; // Reset temporary state
    if (this._topBar) {
      if (this._isTopBarVisible) {
        this._topBar.show();
      } else {
        this._topBar.hide();
      }
    }
    // Notify panel of topbar visibility change
    if (this._layoutMode === "topbar") {
      this._panel.setBarVisibility(this._isTopBarVisible);
    }
    this.updateTabBounds();
  }

  // Toggle sidebar visibility
  toggleSideBarVisibility(): void {
    this._isSideBarVisible = !this._isSideBarVisible;
    this._isTemporarilyShowing = false; // Reset temporary state
    if (this._sideBar) {
      if (this._isSideBarVisible) {
        this._sideBar.show();
      } else {
        this._sideBar.hide();
      }
    }
    // Notify panel of sidebar visibility change (sidebar doesn't affect vertical height)
    if (this._layoutMode === "sidebar") {
      this._panel.setBarVisibility(this._isSideBarVisible);
    }
    this.updateTabBounds();
  }

  // Get topbar visibility
  get isTopBarVisible(): boolean {
    return this._isTopBarVisible;
  }

  // Get sidebar visibility
  get isSideBarVisible(): boolean {
    return this._isSideBarVisible;
  }

  // Show topbar temporarily (for auto-reveal on hover)
  showTopBarTemporarily(): void {
    if (!this._isTopBarVisible && this._topBar) {
      this._topBar.showTemporarily();
      // Temporarily update panel bounds
      this._panel.setBarVisibility(true);
    }
  }

  // Hide topbar temporarily (when mouse leaves)
  hideTopBarTemporarily(): void {
    if (!this._isTopBarVisible && this._topBar) {
      this._topBar.hideTemporarily();
      // Restore panel bounds to hidden bar state
      this._panel.setBarVisibility(false);
    }
  }

  // Show sidebar temporarily (for auto-reveal on hover)
  showSideBarTemporarily(): void {
    if (!this._isSideBarVisible && this._sideBar) {
      this._sideBar.showTemporarily();
      // Temporarily update panel bounds (though sidebar doesn't affect vertical height)
      this._panel.setBarVisibility(true);
    }
  }

  // Hide sidebar temporarily (when mouse leaves)
  hideSideBarTemporarily(): void {
    if (!this._isSideBarVisible && this._sideBar) {
      this._sideBar.hideTemporarily();
      // Restore panel bounds to hidden bar state
      this._panel.setBarVisibility(false);
    }
  }
}
