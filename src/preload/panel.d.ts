import type { UIMessage } from "ai";
import { TabInfo } from "./topbar";

// Re-export for renderer
export type { UIMessage };

export interface ChatRequest {
  message: string;
  context: {
    url: string | null;
    content: string | null;
    text: string | null;
  };
  messageId: string;
}

export interface ChatResponse {
  messageId: string;
  content: string;
  isComplete: boolean;
}

export interface HistorySession {
  id: number;
  start_time: number;
  end_time: number | null;
}

export interface HistoryPageVisit {
  id: number;
  session_id: number;
  tab_id: string;
  url: string;
  title: string;
  timestamp: number;
  duration: number | null;
  favicon_url: string | null;
}

export interface HistoryInteraction {
  id: number;
  visit_id: number;
  type: "click" | "input" | "scroll" | "select" | "clipboard" | "keypress";
  selector: string | null;
  value: string | null;
  x: number | null;
  y: number | null;
  timestamp: number;
}

export interface HistoryScreenshot {
  id: number;
  visit_id: number;
  image_data: string;
  timestamp: number;
}

export interface HistorySnapshot {
  id: number;
  visit_id: number;
  html: string;
  timestamp: number;
}

export interface HistoryScrollEvent {
  id: number;
  visit_id: number;
  x: number;
  y: number;
  timestamp: number;
}

export interface HistoryTabEvent {
  id: number;
  session_id: number;
  tab_id: string;
  action: "created" | "switched" | "closed";
  timestamp: number;
}

export interface HistoryVisitDetails {
  interactions: HistoryInteraction[];
  screenshots: HistoryScreenshot[];
  snapshots: HistorySnapshot[];
  scrollEvents: HistoryScrollEvent[];
}

export interface HistorySettings {
  enabled: boolean;
  excludedDomains: string[];
  autoPurgeDays: number;
  screenshotQuality: "low" | "medium" | "high";
  trackInteractions: boolean;
  trackScrollEvents: boolean;
  trackClipboard: boolean;
}

export interface WorkflowStep {
  action: string;
  target?: string;
  value?: string;
  timestamp: number;
}

export interface WorkflowAnalysis {
  id: string;
  summary: string;
  steps: WorkflowStep[];
  repeatabilityScore: number;
  automationPotential: "low" | "medium" | "high";
  urls: string[];
  sessionId?: number;
}

export interface WorkflowCache {
  id: number;
  session_id: number;
  workflow_data: string;
  created_at: number;
}

export interface PanelAPI {
  // Chat functionality
  sendChatMessage: (request: Partial<ChatRequest>) => Promise<void>;
  clearChat: () => Promise<void>;
  onChatResponse: (callback: (data: ChatResponse) => void) => void;
  onMessagesUpdated: (callback: (messages: UIMessage[]) => void) => void;
  removeChatResponseListener: () => void;
  removeMessagesUpdatedListener: () => void;
  getMessages: () => Promise<UIMessage[]>;
  // Page content access
  getPageContent: () => Promise<string | null>;
  getPageText: () => Promise<string | null>;
  getCurrentUrl: () => Promise<string | null>;

  // Tab information
  getActiveTabInfo: () => Promise<TabInfo | null>;

  // Panel visibility
  getPanelVisibility: () => Promise<boolean>;
  onPanelVisibilityChanged: (
    callback: (isVisible: boolean) => void,
  ) => () => void;

  // History API
  historyGetRecent: (limit?: number) => Promise<HistoryPageVisit[]>;
  historyGetByDateRange: (
    startTime: number,
    endTime: number,
  ) => Promise<HistoryPageVisit[]>;
  historySearch: (query: string, limit?: number) => Promise<HistoryPageVisit[]>;
  historyGetVisitDetails: (
    visitId: number,
  ) => Promise<HistoryVisitDetails | null>;
  historyGetInteractionCount: (visitId: number) => Promise<number>;
  historyGetSessions: () => Promise<HistorySession[]>;
  historyGetSession: (sessionId: number) => Promise<{
    session: HistorySession;
    visits: HistoryPageVisit[];
    tabEvents: HistoryTabEvent[];
  } | null>;
  historyGetCurrentSession: () => Promise<HistorySession | null>;
  historyGetStats: () => Promise<{ visitCount: number }>;
  historySettingsGet: () => Promise<HistorySettings | null>;
  historySettingsUpdate: (config: Partial<HistorySettings>) => Promise<boolean>;
  historyClearOld: (days: number) => Promise<boolean>;

  // Workflow API
  workflowAnalyzeSession: (
    sessionId: number,
  ) => Promise<WorkflowAnalysis | null>;
  workflowAnalyzeRecent: (options?: {
    limit?: number;
  }) => Promise<WorkflowAnalysis | null>;
  workflowGetCached: (sessionId: number) => Promise<WorkflowCache | null>;
}
