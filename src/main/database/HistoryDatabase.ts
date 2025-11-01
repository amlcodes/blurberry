import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";

export interface Session {
  id: number;
  start_time: number;
  end_time: number | null;
}

export interface PageVisit {
  id: number;
  session_id: number;
  tab_id: string;
  url: string;
  title: string;
  timestamp: number;
  duration: number | null;
  favicon_url: string | null;
}

export interface TabEvent {
  id: number;
  session_id: number;
  tab_id: string;
  action: "created" | "switched" | "closed";
  timestamp: number;
}

export interface Interaction {
  id: number;
  visit_id: number;
  type: "click" | "input" | "scroll" | "select" | "clipboard" | "keypress";
  selector: string | null;
  value: string | null;
  x: number | null;
  y: number | null;
  timestamp: number;
}

export interface DOMSnapshot {
  id: number;
  visit_id: number;
  html: string;
  timestamp: number;
}

export interface Screenshot {
  id: number;
  visit_id: number;
  image_data: string;
  timestamp: number;
}

export interface ScrollEvent {
  id: number;
  visit_id: number;
  x: number;
  y: number;
  timestamp: number;
}

export interface WorkflowCache {
  id: number;
  session_id: number;
  workflow_data: string;
  created_at: number;
}

export class HistoryDatabase {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private currentSessionId: number | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private initPromise: Promise<void>;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.dbPath = join(userDataPath, "browsing-history.db");
    this.initPromise = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initializeSchema();

    // Auto-save every 5 seconds
    this.saveTimer = setInterval(() => {
      this.save();
    }, 5000);
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    writeFileSync(this.dbPath, data);
  }

  // Helper to convert sql.js results to objects
  private rowsToObjects<T>(
    results: Array<{ columns: string[]; values: unknown[][] }>,
  ): T[] {
    if (!results || results.length === 0) return [];
    const result = results[0];
    if (!result?.columns || !result?.values) return [];

    return result.values.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj as T;
    });
  }

  private rowToObject<T>(
    results: Array<{ columns: string[]; values: unknown[][] }>,
  ): T | null {
    const rows = this.rowsToObjects<T>(results);
    return rows[0] || null;
  }

  private initializeSchema(): void {
    if (!this.db) return;

    // Sessions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time INTEGER NOT NULL,
        end_time INTEGER
      )
    `);

    // Page visits table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS page_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        tab_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        duration INTEGER,
        favicon_url TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_page_visits_session ON page_visits(session_id)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_page_visits_tab ON page_visits(tab_id)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_page_visits_timestamp ON page_visits(timestamp)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_page_visits_url ON page_visits(url)",
    );

    // Tab events table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tab_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        tab_id TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_tab_events_session ON tab_events(session_id)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_tab_events_timestamp ON tab_events(timestamp)",
    );

    // Interactions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        selector TEXT,
        value TEXT,
        x INTEGER,
        y INTEGER,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (visit_id) REFERENCES page_visits(id)
      )
    `);
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_interactions_visit ON interactions(visit_id)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp)",
    );

    // DOM snapshots table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS dom_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER NOT NULL,
        html TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (visit_id) REFERENCES page_visits(id)
      )
    `);
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_dom_snapshots_visit ON dom_snapshots(visit_id)",
    );

    // Screenshots table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER NOT NULL,
        image_data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (visit_id) REFERENCES page_visits(id)
      )
    `);
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_screenshots_visit ON screenshots(visit_id)",
    );

    // Scroll events table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scroll_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (visit_id) REFERENCES page_visits(id)
      )
    `);
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_scroll_events_visit ON scroll_events(visit_id)",
    );

    // Workflow cache table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS workflow_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        workflow_data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_workflow_cache_session ON workflow_cache(session_id)",
    );
  }

  // Session management
  startSession(): number {
    if (!this.db) throw new Error("Database not initialized");

    this.db.run("INSERT INTO sessions (start_time) VALUES (?)", [Date.now()]);
    const result = this.db.exec("SELECT last_insert_rowid() as id");
    this.currentSessionId = result[0]?.values[0]?.[0] as number;
    this.save();
    return this.currentSessionId!;
  }

  endSession(sessionId: number): void {
    if (!this.db) return;

    this.db.run("UPDATE sessions SET end_time = ? WHERE id = ?", [
      Date.now(),
      sessionId,
    ]);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    this.save();
  }

  getCurrentSessionId(): number | null {
    return this.currentSessionId;
  }

  // Page visit recording
  recordPageVisit(
    sessionId: number,
    tabId: string,
    url: string,
    title: string,
    faviconUrl: string | null = null,
  ): number {
    if (!this.db) throw new Error("Database not initialized");

    this.db.run(
      `INSERT INTO page_visits (session_id, tab_id, url, title, timestamp, favicon_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, tabId, url, title, Date.now(), faviconUrl],
    );
    const result = this.db.exec("SELECT last_insert_rowid() as id");
    return result[0]?.values[0]?.[0] as number;
  }

  updatePageVisitDuration(visitId: number, duration: number): void {
    if (!this.db) return;
    this.db.run("UPDATE page_visits SET duration = ? WHERE id = ?", [
      duration,
      visitId,
    ]);
  }

  // Tab event recording
  recordTabEvent(
    sessionId: number,
    tabId: string,
    action: "created" | "switched" | "closed",
  ): void {
    if (!this.db) return;
    this.db.run(
      "INSERT INTO tab_events (session_id, tab_id, action, timestamp) VALUES (?, ?, ?, ?)",
      [sessionId, tabId, action, Date.now()],
    );
  }

  // Interaction recording
  recordInteraction(
    visitId: number,
    type: "click" | "input" | "scroll" | "select" | "clipboard" | "keypress",
    selector: string | null = null,
    value: string | null = null,
    x: number | null = null,
    y: number | null = null,
  ): void {
    if (!this.db) return;
    this.db.run(
      `INSERT INTO interactions (visit_id, type, selector, value, x, y, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [visitId, type, selector, value, x, y, Date.now()],
    );
  }

  // Batch interaction recording for performance
  recordInteractionsBatch(
    interactions: Array<{
      visitId: number;
      type: "click" | "input" | "scroll" | "select" | "clipboard" | "keypress";
      selector?: string;
      value?: string;
      x?: number;
      y?: number;
      timestamp: number;
    }>,
  ): void {
    if (!this.db) return;

    for (const item of interactions) {
      this.db.run(
        `INSERT INTO interactions (visit_id, type, selector, value, x, y, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.visitId,
          item.type,
          item.selector || null,
          item.value || null,
          item.x || null,
          item.y || null,
          item.timestamp,
        ],
      );
    }
  }

  // Snapshot recording
  recordDOMSnapshot(visitId: number, html: string): void {
    if (!this.db) return;
    this.db.run(
      "INSERT INTO dom_snapshots (visit_id, html, timestamp) VALUES (?, ?, ?)",
      [visitId, html, Date.now()],
    );
  }

  recordScreenshot(visitId: number, imageData: string): void {
    if (!this.db) return;
    this.db.run(
      "INSERT INTO screenshots (visit_id, image_data, timestamp) VALUES (?, ?, ?)",
      [visitId, imageData, Date.now()],
    );
  }

  recordScrollEvent(visitId: number, x: number, y: number): void {
    if (!this.db) return;
    this.db.run(
      "INSERT INTO scroll_events (visit_id, x, y, timestamp) VALUES (?, ?, ?, ?)",
      [visitId, x, y, Date.now()],
    );
  }

  // Query methods
  getSessionHistory(sessionId: number): {
    session: Session;
    visits: PageVisit[];
    tabEvents: TabEvent[];
  } {
    if (!this.db) {
      return { session: {} as Session, visits: [], tabEvents: [] };
    }

    const sessionResult = this.db.exec("SELECT * FROM sessions WHERE id = ?", [
      sessionId,
    ]);
    const session = this.rowToObject<Session>(sessionResult);

    const visitsResult = this.db.exec(
      "SELECT * FROM page_visits WHERE session_id = ? ORDER BY timestamp ASC",
      [sessionId],
    );
    const visits = this.rowsToObjects<PageVisit>(visitsResult);

    const tabEventsResult = this.db.exec(
      "SELECT * FROM tab_events WHERE session_id = ? ORDER BY timestamp ASC",
      [sessionId],
    );
    const tabEvents = this.rowsToObjects<TabEvent>(tabEventsResult);

    return { session: session!, visits, tabEvents };
  }

  getRecentHistory(limit: number = 50): PageVisit[] {
    if (!this.db) return [];
    const result = this.db.exec(
      `SELECT * FROM page_visits 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [limit],
    );
    return this.rowsToObjects<PageVisit>(result);
  }

  getHistoryByDateRange(startTime: number, endTime: number): PageVisit[] {
    if (!this.db) return [];
    const result = this.db.exec(
      `SELECT * FROM page_visits 
       WHERE timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC`,
      [startTime, endTime],
    );
    return this.rowsToObjects<PageVisit>(result);
  }

  getVisitInteractions(visitId: number): Interaction[] {
    if (!this.db) return [];
    const result = this.db.exec(
      "SELECT * FROM interactions WHERE visit_id = ? ORDER BY timestamp ASC",
      [visitId],
    );
    return this.rowsToObjects<Interaction>(result);
  }

  getVisitScreenshots(visitId: number): Screenshot[] {
    if (!this.db) return [];
    const result = this.db.exec(
      "SELECT * FROM screenshots WHERE visit_id = ? ORDER BY timestamp ASC",
      [visitId],
    );
    return this.rowsToObjects<Screenshot>(result);
  }

  getVisitSnapshots(visitId: number): DOMSnapshot[] {
    if (!this.db) return [];
    const result = this.db.exec(
      "SELECT * FROM dom_snapshots WHERE visit_id = ? ORDER BY timestamp ASC",
      [visitId],
    );
    return this.rowsToObjects<DOMSnapshot>(result);
  }

  getVisitScrollEvents(visitId: number): ScrollEvent[] {
    if (!this.db) return [];
    const result = this.db.exec(
      "SELECT * FROM scroll_events WHERE visit_id = ? ORDER BY timestamp ASC",
      [visitId],
    );
    return this.rowsToObjects<ScrollEvent>(result);
  }

  // Search functionality
  searchHistory(query: string, limit: number = 50): PageVisit[] {
    if (!this.db) return [];
    const searchTerm = `%${query}%`;
    const result = this.db.exec(
      `SELECT * FROM page_visits 
       WHERE title LIKE ? OR url LIKE ?
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [searchTerm, searchTerm, limit],
    );
    return this.rowsToObjects<PageVisit>(result);
  }

  // Workflow cache
  cacheWorkflow(sessionId: number, workflowData: string): void {
    if (!this.db) return;
    this.db.run(
      "INSERT INTO workflow_cache (session_id, workflow_data, created_at) VALUES (?, ?, ?)",
      [sessionId, workflowData, Date.now()],
    );
    this.save();
  }

  getWorkflowCache(sessionId: number): WorkflowCache | null {
    if (!this.db) return null;
    const result = this.db.exec(
      "SELECT * FROM workflow_cache WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
      [sessionId],
    );
    return this.rowToObject<WorkflowCache>(result);
  }

  // Cleanup methods
  deleteOldHistory(olderThanDays: number): void {
    if (!this.db) return;
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    // Delete in order to respect foreign key constraints
    const stmts = [
      "DELETE FROM scroll_events WHERE visit_id IN (SELECT id FROM page_visits WHERE timestamp < ?)",
      "DELETE FROM screenshots WHERE visit_id IN (SELECT id FROM page_visits WHERE timestamp < ?)",
      "DELETE FROM dom_snapshots WHERE visit_id IN (SELECT id FROM page_visits WHERE timestamp < ?)",
      "DELETE FROM interactions WHERE visit_id IN (SELECT id FROM page_visits WHERE timestamp < ?)",
      "DELETE FROM page_visits WHERE timestamp < ?",
      "DELETE FROM tab_events WHERE timestamp < ?",
      "DELETE FROM sessions WHERE start_time < ?",
    ];

    for (const sql of stmts) {
      this.db.run(sql, [cutoffTime]);
    }
    this.save();
  }

  // Get all sessions
  getAllSessions(): Session[] {
    if (!this.db) return [];
    const result = this.db.exec(
      "SELECT * FROM sessions ORDER BY start_time DESC",
    );
    return this.rowsToObjects<Session>(result);
  }

  // Get current session
  getCurrentSession(): Session | null {
    if (!this.db || this.currentSessionId === null) return null;
    const result = this.db.exec("SELECT * FROM sessions WHERE id = ?", [
      this.currentSessionId,
    ]);
    return this.rowToObject<Session>(result);
  }

  // Statistics
  getVisitCount(): number {
    if (!this.db) return 0;
    const result = this.db.exec("SELECT COUNT(*) as count FROM page_visits");
    const row = this.rowToObject<{ count: number }>(result);
    return row?.count || 0;
  }

  getInteractionCount(visitId: number): number {
    if (!this.db) return 0;
    const result = this.db.exec(
      "SELECT COUNT(*) as count FROM interactions WHERE visit_id = ?",
      [visitId],
    );
    const row = this.rowToObject<{ count: number }>(result);
    return row?.count || 0;
  }

  // Cleanup on close
  close(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    this.save();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
