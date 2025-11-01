import { ipcMain, WebContents } from "electron";
import type { Window } from "./Window";

export class EventManager {
  private mainWindow: Window;

  constructor(mainWindow: Window) {
    this.mainWindow = mainWindow;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Tab management events
    this.handleTabEvents();

    // Panel events
    this.handlePanelEvents();

    // Sidebar events
    this.handleSidebarEvents();

    // Page content events
    this.handlePageContentEvents();

    // Dark mode events
    this.handleDarkModeEvents();

    // History events
    this.handleHistoryEvents();

    // Debug events
    this.handleDebugEvents();
  }

  private handleTabEvents(): void {
    // Create new tab
    ipcMain.handle("create-tab", (_, url?: string) => {
      const newTab = this.mainWindow.createTab(url);
      return { id: newTab.id, title: newTab.title, url: newTab.url };
    });

    // Close tab
    ipcMain.handle("close-tab", (_, id: string) => {
      this.mainWindow.closeTab(id);
    });

    // Switch tab
    ipcMain.handle("switch-tab", (_, id: string) => {
      this.mainWindow.switchActiveTab(id);
    });

    // Reorder tabs
    ipcMain.handle("reorder-tabs", (_, orderedTabIds: string[]) => {
      return this.mainWindow.reorderTabs(orderedTabIds);
    });

    // Get tabs
    ipcMain.handle("get-tabs", () => {
      const activeTabId = this.mainWindow.activeTab?.id;
      return this.mainWindow.allTabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        isActive: activeTabId === tab.id,
        groupId: tab.groupId,
      }));
    });

    // Group management
    ipcMain.handle("create-group", (_, title: string, colorId?: string) => {
      const group = this.mainWindow.createGroup(title, colorId);
      return group.toJSON();
    });

    ipcMain.handle("delete-group", (_, groupId: string) => {
      return this.mainWindow.deleteGroup(groupId);
    });

    ipcMain.handle(
      "update-group",
      (
        _,
        groupId: string,
        updates: { title?: string; colorId?: string; isCollapsed?: boolean },
      ) => {
        return this.mainWindow.updateGroup(groupId, updates);
      },
    );

    ipcMain.handle("add-tab-to-group", (_, tabId: string, groupId: string) => {
      return this.mainWindow.addTabToGroup(tabId, groupId);
    });

    ipcMain.handle("remove-tab-from-group", (_, tabId: string) => {
      return this.mainWindow.removeTabFromGroup(tabId);
    });

    ipcMain.handle("get-groups", () => {
      return this.mainWindow.allGroups.map((group) => group.toJSON());
    });

    ipcMain.handle("reorder-groups", (_, orderedGroupIds: string[]) => {
      return this.mainWindow.reorderGroups(orderedGroupIds);
    });

    ipcMain.handle("update-tab-positions", (_, orderedTabIds: string[]) => {
      return this.mainWindow.updateTabPositions(orderedTabIds);
    });

    ipcMain.handle("organize-tabs", async () => {
      const ungroupedTabs = Array.from(this.mainWindow.allTabs.entries())
        .filter(([, tab]) => !tab.groupId)
        .map(([, tab]) => tab);

      if (ungroupedTabs.length < 3) {
        throw new Error("Need at least 3 ungrouped tabs to organize");
      }

      const tabsData = await Promise.all(
        ungroupedTabs.map(async (tab) => {
          let content = "";
          try {
            content = await tab.getTabText();
          } catch (error) {
            console.error(`Failed to get content for tab ${tab.id}:`, error);
          }
          return {
            id: tab.id,
            title: tab.title,
            url: tab.url,
            content,
          };
        }),
      );

      return await this.mainWindow.llmClient.organizeTabs(tabsData);
    });

    // Navigation (for compatibility with existing code)
    ipcMain.handle("navigate-to", (_, url: string) => {
      if (this.mainWindow.activeTab) {
        void this.mainWindow.activeTab.loadURL(url);
      }
    });

    ipcMain.handle("navigate-tab", async (_, tabId: string, url: string) => {
      const tab = this.mainWindow.getTab(tabId);
      if (tab) {
        await tab.loadURL(url);
        return true;
      }
      return false;
    });

    ipcMain.handle("go-back", () => {
      if (this.mainWindow.activeTab) {
        this.mainWindow.activeTab.goBack();
      }
    });

    ipcMain.handle("go-forward", () => {
      if (this.mainWindow.activeTab) {
        this.mainWindow.activeTab.goForward();
      }
    });

    ipcMain.handle("reload", () => {
      if (this.mainWindow.activeTab) {
        this.mainWindow.activeTab.reload();
      }
    });

    ipcMain.handle("stop", () => {
      if (this.mainWindow.activeTab) {
        this.mainWindow.activeTab.stop();
      }
    });

    // Tab-specific navigation handlers
    ipcMain.handle("tab-go-back", (_, tabId: string) => {
      const tab = this.mainWindow.getTab(tabId);
      if (tab) {
        tab.goBack();
        return true;
      }
      return false;
    });

    ipcMain.handle("tab-go-forward", (_, tabId: string) => {
      const tab = this.mainWindow.getTab(tabId);
      if (tab) {
        tab.goForward();
        return true;
      }
      return false;
    });

    ipcMain.handle("tab-reload", (_, tabId: string) => {
      const tab = this.mainWindow.getTab(tabId);
      if (tab) {
        tab.reload();
        return true;
      }
      return false;
    });

    ipcMain.handle("tab-stop", (_, tabId: string) => {
      const tab = this.mainWindow.getTab(tabId);
      if (tab) {
        tab.stop();
        return true;
      }
      return false;
    });

    // Open URL in new tab (for RAG browsing history search)
    ipcMain.handle("browser-open-url", (_, url: string) => {
      const tab = this.mainWindow.createTab(url);
      this.mainWindow.switchActiveTab(tab.id);
      return tab.id;
    });

    ipcMain.handle("tab-screenshot", async (_, tabId: string) => {
      const tab = this.mainWindow.getTab(tabId);
      if (tab) {
        const image = await tab.screenshot();
        return image.toDataURL();
      }
      return null;
    });

    ipcMain.handle("tab-run-js", async (_, tabId: string, code: string) => {
      const tab = this.mainWindow.getTab(tabId);
      if (tab) {
        return await tab.runJs(code);
      }
      return null;
    });

    // Tab info
    ipcMain.handle("get-active-tab-info", () => {
      const activeTab = this.mainWindow.activeTab;
      if (activeTab) {
        return {
          id: activeTab.id,
          url: activeTab.url,
          title: activeTab.title,
          canGoBack: activeTab.webContents.canGoBack(),
          canGoForward: activeTab.webContents.canGoForward(),
        };
      }
      return null;
    });
  }

  private handlePanelEvents(): void {
    // Toggle panel
    ipcMain.handle("toggle-panel", () => {
      this.mainWindow.panel.toggle();
      this.mainWindow.updateAllBounds();
      // Notify TopBar and Panel of visibility change
      const isVisible = this.mainWindow.panel.getIsVisible();
      if (this.mainWindow.topBar) {
        this.mainWindow.topBar.view.webContents.send(
          "panel-visibility-changed",
          isVisible,
        );
      }
      this.mainWindow.panel.view.webContents.send(
        "panel-visibility-changed",
        isVisible,
      );
      return isVisible;
    });

    // Get panel visibility state
    ipcMain.handle("get-panel-visibility", () => {
      return this.mainWindow.panel.getIsVisible();
    });

    // Chat message
    ipcMain.handle("panel-chat-message", async (_, request) => {
      // The LLMClient now handles getting the screenshot and context directly
      await this.mainWindow.panel.client.sendChatMessage(request);
    });

    // Clear chat
    ipcMain.handle("panel-clear-chat", () => {
      this.mainWindow.panel.client.clearMessages();
      return true;
    });

    // Get messages
    ipcMain.handle("panel-get-messages", () => {
      return this.mainWindow.panel.client.getMessages();
    });
  }

  private handleSidebarEvents(): void {
    // Resize sidebar
    ipcMain.handle("resize-sidebar", (_, width: number) => {
      this.mainWindow.resizeSidebar(width);
      return true;
    });

    // Get sidebar width
    ipcMain.handle("get-sidebar-width", () => {
      return this.mainWindow.sideBar?.width || 240;
    });

    // Toggle topbar visibility
    ipcMain.handle("toggle-topbar-visibility", () => {
      this.mainWindow.toggleTopBarVisibility();
      return this.mainWindow.isTopBarVisible;
    });

    // Toggle sidebar visibility
    ipcMain.handle("toggle-sidebar-visibility", () => {
      this.mainWindow.toggleSideBarVisibility();
      return this.mainWindow.isSideBarVisible;
    });

    // Get topbar visibility
    ipcMain.handle("get-topbar-visibility", () => {
      return this.mainWindow.isTopBarVisible;
    });

    // Get sidebar visibility
    ipcMain.handle("get-sidebar-visibility", () => {
      return this.mainWindow.isSideBarVisible;
    });

    // Show/hide topbar temporarily (for hover detection)
    ipcMain.handle("show-topbar-temporarily", () => {
      this.mainWindow.showTopBarTemporarily();
    });

    ipcMain.handle("hide-topbar-temporarily", () => {
      this.mainWindow.hideTopBarTemporarily();
    });

    // Show/hide sidebar temporarily (for hover detection)
    ipcMain.handle("show-sidebar-temporarily", () => {
      this.mainWindow.showSideBarTemporarily();
    });

    ipcMain.handle("hide-sidebar-temporarily", () => {
      this.mainWindow.hideSideBarTemporarily();
    });
  }

  private handlePageContentEvents(): void {
    // Get page content
    ipcMain.handle("get-page-content", async () => {
      if (this.mainWindow.activeTab) {
        try {
          return await this.mainWindow.activeTab.getTabHtml();
        } catch (error) {
          console.error("Error getting page content:", error);
          return null;
        }
      }
      return null;
    });

    // Get page text
    ipcMain.handle("get-page-text", async () => {
      if (this.mainWindow.activeTab) {
        try {
          return await this.mainWindow.activeTab.getTabText();
        } catch (error) {
          console.error("Error getting page text:", error);
          return null;
        }
      }
      return null;
    });

    // Get current URL
    ipcMain.handle("get-current-url", () => {
      if (this.mainWindow.activeTab) {
        return this.mainWindow.activeTab.url;
      }
      return null;
    });
  }

  private handleDarkModeEvents(): void {
    // Dark mode broadcasting
    ipcMain.on("dark-mode-changed", (event, isDarkMode) => {
      this.broadcastDarkMode(event.sender, isDarkMode);
    });
  }

  private handleHistoryEvents(): void {
    // Get recent history
    ipcMain.handle("history-get-recent", (_, limit?: number) => {
      const database = this.mainWindow.historyDatabase;
      const tracker = this.mainWindow.historyTracker;
      if (!database) return [];

      // Flush any pending interactions before fetching history
      if (tracker) {
        tracker.flushInteractions();
      }

      return database.getRecentHistory(limit || 50);
    });

    // Get history by date range
    ipcMain.handle(
      "history-get-by-date-range",
      (_, startTime: number, endTime: number) => {
        const database = this.mainWindow.historyDatabase;
        if (!database) return [];
        return database.getHistoryByDateRange(startTime, endTime);
      },
    );

    // Search history
    ipcMain.handle("history-search", (_, query: string, limit?: number) => {
      const database = this.mainWindow.historyDatabase;
      if (!database) return [];
      return database.searchHistory(query, limit || 50);
    });

    // Get visit details
    ipcMain.handle("history-get-visit-details", (_, visitId: number) => {
      const database = this.mainWindow.historyDatabase;
      const tracker = this.mainWindow.historyTracker;
      if (!database) return null;

      // Flush any pending interactions before fetching details
      if (tracker) {
        tracker.flushInteractions();
      }

      return {
        interactions: database.getVisitInteractions(visitId),
        screenshots: database.getVisitScreenshots(visitId),
        snapshots: database.getVisitSnapshots(visitId),
        scrollEvents: database.getVisitScrollEvents(visitId),
      };
    });

    // Get interaction count for a visit
    ipcMain.handle("history-get-interaction-count", (_, visitId: number) => {
      const database = this.mainWindow.historyDatabase;
      if (!database) return 0;
      return database.getInteractionCount(visitId);
    });

    // Get all sessions
    ipcMain.handle("history-get-sessions", () => {
      const database = this.mainWindow.historyDatabase;
      if (!database) return [];
      return database.getAllSessions();
    });

    // Get session history
    ipcMain.handle("history-get-session", (_, sessionId: number) => {
      const database = this.mainWindow.historyDatabase;
      if (!database) return null;
      return database.getSessionHistory(sessionId);
    });

    // Get current session
    ipcMain.handle("history-get-current-session", () => {
      const database = this.mainWindow.historyDatabase;
      if (!database) return null;
      return database.getCurrentSession();
    });

    // Track interaction (called from injected scripts)
    ipcMain.on(
      "history-track-interaction",
      (
        _,
        interaction: {
          visitId: number;
          type:
            | "click"
            | "input"
            | "scroll"
            | "select"
            | "clipboard"
            | "keypress";
          selector?: string;
          value?: string;
          x?: number;
          y?: number;
          timestamp: number;
        },
      ) => {
        const tracker = this.mainWindow.historyTracker;
        if (tracker) {
          tracker.recordInteraction(interaction);
        }
      },
    );

    // Get statistics
    ipcMain.handle("history-get-stats", () => {
      const database = this.mainWindow.historyDatabase;
      if (!database) return { visitCount: 0 };
      return {
        visitCount: database.getVisitCount(),
      };
    });

    // History settings
    ipcMain.handle("history-settings-get", () => {
      const settings = this.mainWindow.historySettings;
      return settings?.toJSON() || null;
    });

    ipcMain.handle(
      "history-settings-update",
      (_, config: Record<string, unknown>) => {
        const settings = this.mainWindow.historySettings;
        if (settings) {
          settings.fromJSON(config);
          return true;
        }
        return false;
      },
    );

    // Clear old history
    ipcMain.handle("history-clear-old", (_, days: number) => {
      const database = this.mainWindow.historyDatabase;
      if (!database) return false;
      database.deleteOldHistory(days);
      return true;
    });

    // Workflow analysis
    ipcMain.handle("workflow-analyze-session", async (_, sessionId: number) => {
      const analyzer = this.mainWindow.workflowAnalyzer;
      if (!analyzer) return null;
      try {
        const workflow = await analyzer.analyzeSession(sessionId);
        // Transform to UI format
        return {
          id: `session-${sessionId}`,
          summary: `${workflow.workflow_name}: ${workflow.description}`,
          steps: workflow.steps.map((step) => ({
            action: step.description,
            target: step.selector || step.url,
            value: step.value,
            timestamp: Date.now(),
          })),
          repeatabilityScore: workflow.repeatability_score,
          automationPotential: workflow.automation_potential,
          urls: workflow.steps
            .map((s) => s.url)
            .filter((url): url is string => !!url),
          sessionId: sessionId,
        };
      } catch (error) {
        console.error("Failed to analyze workflow:", error);
        return null;
      }
    });

    ipcMain.handle(
      "workflow-analyze-recent",
      async (_, options?: { limit?: number }) => {
        const analyzer = this.mainWindow.workflowAnalyzer;
        if (!analyzer) return null;
        try {
          const workflow = await analyzer.analyzeRecentHistory(options?.limit);
          // Transform to UI format
          return {
            id: `recent-${Date.now()}`,
            summary: `${workflow.workflow_name}: ${workflow.description}`,
            steps: workflow.steps.map((step) => ({
              action: step.description,
              target: step.selector || step.url,
              value: step.value,
              timestamp: Date.now(),
            })),
            repeatabilityScore: workflow.repeatability_score,
            automationPotential: workflow.automation_potential,
            urls: workflow.steps
              .map((s) => s.url)
              .filter((url): url is string => !!url),
          };
        } catch (error) {
          console.error("Failed to analyze recent workflow:", error);
          return null;
        }
      },
    );

    ipcMain.handle("workflow-get-cached", (_, sessionId: number) => {
      const database = this.mainWindow.historyDatabase;
      if (!database) return null;
      return database.getWorkflowCache(sessionId);
    });
  }

  private handleDebugEvents(): void {
    // Ping test
    ipcMain.on("ping", () => console.log("pong"));
  }

  private broadcastDarkMode(sender: WebContents, isDarkMode: boolean): void {
    // Send to topbar
    if (
      this.mainWindow.topBar &&
      this.mainWindow.topBar.view.webContents !== sender
    ) {
      this.mainWindow.topBar.view.webContents.send(
        "dark-mode-updated",
        isDarkMode,
      );
    }

    // Send to sidebar
    if (
      this.mainWindow.sideBar &&
      this.mainWindow.sideBar.view.webContents !== sender
    ) {
      this.mainWindow.sideBar.view.webContents.send(
        "dark-mode-updated",
        isDarkMode,
      );
    }

    // Send to panel
    if (this.mainWindow.panel.view.webContents !== sender) {
      this.mainWindow.panel.view.webContents.send(
        "dark-mode-updated",
        isDarkMode,
      );
    }

    // Send to all tabs
    this.mainWindow.allTabs.forEach((tab) => {
      if (tab.webContents !== sender) {
        tab.webContents.send("dark-mode-updated", isDarkMode);
      }
    });
  }

  // Clean up event listeners
  public cleanup(): void {
    ipcMain.removeAllListeners();
  }
}
