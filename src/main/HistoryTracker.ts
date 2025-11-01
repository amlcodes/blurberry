import type { WebContents } from "electron";
import type { HistoryDatabase } from "./database/HistoryDatabase";
import type { Tab } from "./Tab";
import type { Window } from "./Window";

interface PendingInteraction {
  visitId: number;
  type: "click" | "input" | "scroll" | "select" | "clipboard" | "keypress";
  selector?: string;
  value?: string;
  x?: number;
  y?: number;
  timestamp: number;
}

interface VisitTracker {
  visitId: number;
  startTime: number;
  lastScreenshot: number;
  lastSnapshot: number;
}

export class HistoryTracker {
  private window: Window;
  private database: HistoryDatabase;
  private sessionId: number | null = null;
  private pendingInteractions: PendingInteraction[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private visitTrackers: Map<string, VisitTracker> = new Map();
  private enabled: boolean = true;
  private excludedDomains: Set<string> = new Set();

  // Throttle settings
  private readonly BATCH_INTERVAL = 2000; // 2 seconds
  private readonly SCREENSHOT_THROTTLE = 30000; // 30 seconds
  private readonly SNAPSHOT_THROTTLE = 60000; // 60 seconds

  constructor(window: Window, database: HistoryDatabase) {
    this.window = window;
    this.database = database;
  }

  // Start tracking
  start(): void {
    if (!this.enabled) return;

    // Start a new session
    this.sessionId = this.database.startSession();
    console.log(`✅ History tracking started. Session ID: ${this.sessionId}`);

    // Set up batch processing
    this.batchInterval = setInterval(() => {
      this.flushPendingInteractions();
    }, this.BATCH_INTERVAL);

    // Set up listeners on existing tabs
    this.window.allTabs.forEach((tab) => {
      this.setupTabListeners(tab);
    });
  }

  // Stop tracking
  stop(): void {
    if (this.sessionId !== null) {
      this.flushPendingInteractions();
      this.database.endSession(this.sessionId);
      console.log(`🛑 History tracking stopped. Session ID: ${this.sessionId}`);
      this.sessionId = null;
    }

    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
  }

  // Setup listeners for a tab
  setupTabListeners(tab: Tab): void {
    if (!this.enabled || this.sessionId === null) return;

    const tabId = tab.id;
    const webContents = tab.webContents;

    // Record tab creation
    this.database.recordTabEvent(this.sessionId, tabId, "created");

    // Track navigation
    webContents.on("did-navigate", (_, url) => {
      this.handleNavigation(tab, url);
    });

    webContents.on("did-navigate-in-page", (_, url) => {
      this.handleNavigation(tab, url);
    });

    // Track page title updates
    webContents.on("page-title-updated", (_, title) => {
      this.handleTitleUpdate(tab, title);
    });

    // Inject tracking script when page loads
    webContents.on("did-finish-load", () => {
      this.injectTrackingScript(webContents, tabId);
    });

    // Track page favicon
    webContents.on("page-favicon-updated", (_, favicons) => {
      if (favicons.length > 0) {
        this.handleFaviconUpdate();
      }
    });
  }

  // Handle navigation events
  private handleNavigation(tab: Tab, url: string): void {
    if (!this.enabled || this.sessionId === null) return;
    if (this.isExcludedDomain(url)) return;

    const tabId = tab.id;

    // End previous visit if exists
    const previousTracker = this.visitTrackers.get(tabId);
    if (previousTracker) {
      const duration = Date.now() - previousTracker.startTime;
      this.database.updatePageVisitDuration(previousTracker.visitId, duration);
    }

    // Record new visit
    const visitId = this.database.recordPageVisit(
      this.sessionId,
      tabId,
      url,
      tab.title || "Loading...",
    );

    // Track this visit
    this.visitTrackers.set(tabId, {
      visitId,
      startTime: Date.now(),
      lastScreenshot: 0,
      lastSnapshot: 0,
    });

    // Take initial screenshot after a short delay (let page render)
    setTimeout(() => {
      this.captureScreenshot(tab, visitId);
    }, 1000);

    // Take initial DOM snapshot
    setTimeout(() => {
      this.captureDOMSnapshot(tab, visitId);
    }, 1500);
  }

  // Handle title updates
  private handleTitleUpdate(tab: Tab, title: string): void {
    if (!this.enabled || this.sessionId === null) return;

    const tabId = tab.id;
    const tracker = this.visitTrackers.get(tabId);

    if (tracker && title && title !== "Loading...") {
      // Update the page visit with the new title (we'll need to add this method)
      // For now, we can skip this or store it in a way that updates aren't needed
    }
  }

  // Handle favicon updates
  private handleFaviconUpdate(): void {
    // We could update the page_visits table with favicon_url here if needed
    // For now, this is a placeholder for future enhancement
  }

  // Handle tab switching
  handleTabSwitch(tabId: string): void {
    if (!this.enabled || this.sessionId === null) return;

    this.database.recordTabEvent(this.sessionId, tabId, "switched");
  }

  // Handle tab closing
  handleTabClose(tabId: string): void {
    if (!this.enabled || this.sessionId === null) return;

    // Record tab close event
    this.database.recordTabEvent(this.sessionId, tabId, "closed");

    // End the visit for this tab
    const tracker = this.visitTrackers.get(tabId);
    if (tracker) {
      const duration = Date.now() - tracker.startTime;
      this.database.updatePageVisitDuration(tracker.visitId, duration);
      this.visitTrackers.delete(tabId);
    }
  }

  // Inject tracking script into page
  private injectTrackingScript(webContents: WebContents, tabId: string): void {
    const tracker = this.visitTrackers.get(tabId);
    if (!tracker) return;

    const visitId = tracker.visitId;

    // Inject a content script that will track interactions
    const trackingScript = `
      (function() {
        console.log('[HistoryTracker] Injected tracking script, visitId: ${visitId}');
        console.log('[HistoryTracker] electronAPI available:', !!window.electronAPI);
        console.log('[HistoryTracker] trackInteraction available:', !!window.electronAPI?.trackInteraction);
        
        // Track clicks
        document.addEventListener('click', (e) => {
          console.log('[HistoryTracker] Click detected');
          const target = e.target;
          const selector = getSelector(target);
          console.log('[HistoryTracker] Tracking click:', selector);
          if (window.electronAPI?.trackInteraction) {
            window.electronAPI.trackInteraction({
              visitId: ${visitId},
              type: 'click',
              selector: selector,
              x: e.clientX,
              y: e.clientY,
              timestamp: Date.now()
            });
          } else {
            console.error('[HistoryTracker] electronAPI.trackInteraction not available');
          }
        }, true);

        // Track input changes (debounced)
        let inputTimeout;
        document.addEventListener('input', (e) => {
          const target = e.target;
          if (target.type === 'password') return; // Skip password fields
          if (target.autocomplete === 'off') return; // Respect autocomplete=off
          
          clearTimeout(inputTimeout);
          inputTimeout = setTimeout(() => {
            const selector = getSelector(target);
            const value = target.value ? '[REDACTED]' : ''; // Don't store actual values
            window.electronAPI?.trackInteraction({
              visitId: ${visitId},
              type: 'input',
              selector: selector,
              value: value,
              timestamp: Date.now()
            });
          }, 500);
        }, true);

        // Track scroll (throttled)
        let scrollTimeout;
        let lastScrollTime = 0;
        document.addEventListener('scroll', () => {
          const now = Date.now();
          if (now - lastScrollTime < 500) return; // Throttle to max once per 500ms
          
          lastScrollTime = now;
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            window.electronAPI?.trackInteraction({
              visitId: ${visitId},
              type: 'scroll',
              x: window.scrollX,
              y: window.scrollY,
              timestamp: Date.now()
            });
          }, 200);
        }, true);

        // Track text selection
        document.addEventListener('selectionchange', () => {
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0) {
            window.electronAPI?.trackInteraction({
              visitId: ${visitId},
              type: 'select',
              value: selection.toString().substring(0, 100), // First 100 chars only
              timestamp: Date.now()
            });
          }
        });

        // Helper function to get a CSS selector for an element
        function getSelector(element) {
          if (!element) return null;
          
          // Try ID first
          if (element.id) return '#' + element.id;
          
          // Try classes
          if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c).join('.');
            if (classes) return element.tagName.toLowerCase() + '.' + classes;
          }
          
          // Try name attribute
          if (element.name) {
            return element.tagName.toLowerCase() + '[name="' + element.name + '"]';
          }
          
          // Try type attribute for inputs
          if (element.type) {
            return element.tagName.toLowerCase() + '[type="' + element.type + '"]';
          }
          
          // Fallback to tag name
          return element.tagName.toLowerCase();
        }

        // Set up API bridge if it doesn't exist
        if (!window.electronAPI) {
          window.electronAPI = {};
        }
      })();
    `;

    webContents.executeJavaScript(trackingScript).catch((err) => {
      console.error("Failed to inject tracking script:", err);
    });
  }

  // Capture screenshot (throttled)
  private async captureScreenshot(tab: Tab, visitId: number): Promise<void> {
    const tracker = this.visitTrackers.get(tab.id);
    if (!tracker) return;

    const now = Date.now();
    if (now - tracker.lastScreenshot < this.SCREENSHOT_THROTTLE) {
      return; // Throttle screenshots
    }

    try {
      const image = await tab.screenshot();
      const imageData = image.toDataURL();
      this.database.recordScreenshot(visitId, imageData);
      tracker.lastScreenshot = now;
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
    }
  }

  // Capture DOM snapshot (throttled)
  private async captureDOMSnapshot(tab: Tab, visitId: number): Promise<void> {
    const tracker = this.visitTrackers.get(tab.id);
    if (!tracker) return;

    const now = Date.now();
    if (now - tracker.lastSnapshot < this.SNAPSHOT_THROTTLE) {
      return; // Throttle snapshots
    }

    try {
      const html = await tab.getTabHtml();
      // Store a truncated version to save space
      const truncatedHtml = html.substring(0, 50000); // Max 50KB
      this.database.recordDOMSnapshot(visitId, truncatedHtml);
      tracker.lastSnapshot = now;
    } catch (error) {
      console.error("Failed to capture DOM snapshot:", error);
    }
  }

  // Record interaction from injected script
  recordInteraction(interaction: {
    visitId: number;
    type: "click" | "input" | "scroll" | "select" | "clipboard" | "keypress";
    selector?: string;
    value?: string;
    x?: number;
    y?: number;
    timestamp: number;
  }): void {
    console.log("[HistoryTracker] Recording interaction:", interaction);
    if (!this.enabled) return;

    this.pendingInteractions.push(interaction);

    // If buffer is too large, flush immediately
    if (this.pendingInteractions.length > 100) {
      this.flushPendingInteractions();
    }
  }

  // Flush pending interactions to database
  private flushPendingInteractions(): void {
    if (this.pendingInteractions.length === 0) return;

    try {
      this.database.recordInteractionsBatch(this.pendingInteractions);
      this.pendingInteractions = [];
    } catch (error) {
      console.error("Failed to flush interactions:", error);
    }
  }

  // Domain exclusion
  private isExcludedDomain(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return this.excludedDomains.has(hostname);
    } catch {
      return false;
    }
  }

  addExcludedDomain(domain: string): void {
    this.excludedDomains.add(domain);
  }

  removeExcludedDomain(domain: string): void {
    this.excludedDomains.delete(domain);
  }

  // Enable/disable tracking
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.sessionId !== null) {
      this.stop();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getSessionId(): number | null {
    return this.sessionId;
  }

  // Get current visit ID for a tab
  getCurrentVisitId(tabId: string): number | null {
    return this.visitTrackers.get(tabId)?.visitId || null;
  }
}
