import type {
  HistoryPageVisit,
  HistoryVisitDetails,
  WorkflowAnalysis,
} from "@preload/panel.d";
import { Button } from "@renderer/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  MousePointer,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface HistoryProps {
  onExportWorkflow?: (visits: HistoryPageVisit[]) => void;
}

// Format timestamp to readable date
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
};

// Format duration
const formatDuration = (ms: number | null): string => {
  if (!ms) return "< 1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

// Get domain from URL
const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

// Group visits by time period
const groupVisitsByPeriod = (
  visits: HistoryPageVisit[],
): Map<string, HistoryPageVisit[]> => {
  const groups = new Map<string, HistoryPageVisit[]>();
  const now = new Date();

  visits.forEach((visit) => {
    const visitDate = new Date(visit.timestamp);
    const diffDays = Math.floor(
      (now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    let period: string;
    if (diffDays === 0) {
      period = "Today";
    } else if (diffDays === 1) {
      period = "Yesterday";
    } else if (diffDays < 7) {
      period = "Last 7 Days";
    } else if (diffDays < 30) {
      period = "Last 30 Days";
    } else {
      period = "Older";
    }

    if (!groups.has(period)) {
      groups.set(period, []);
    }
    groups.get(period)!.push(visit);
  });

  return groups;
};

// Visit Item Component
const VisitItem: React.FC<{
  visit: HistoryPageVisit;
  onExpand: () => void;
  isExpanded: boolean;
  details: HistoryVisitDetails | null;
  interactionCount: number;
}> = ({ visit, onExpand, isExpanded, details, interactionCount }) => {
  return (
    <div className="group border-b border-border/50 last:border-0">
      <div
        className="flex items-start gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={onExpand}
      >
        {/* Expand icon */}
        <button className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        {/* Favicon or placeholder */}
        <div className="size-4 mt-1 shrink-0">
          {visit.favicon_url ? (
            <img
              src={visit.favicon_url}
              alt=""
              className="size-4 rounded"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="size-4 rounded bg-muted" />
          )}
        </div>

        {/* Visit info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">
                {visit.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {getDomain(visit.url)}
              </p>
            </div>
            {interactionCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <MousePointer className="size-3" />
                <span>{interactionCount}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span>{formatTimestamp(visit.timestamp)}</span>
            {visit.duration && (
              <>
                <span>•</span>
                <span>{formatDuration(visit.duration)}</span>
              </>
            )}
          </div>
        </div>

        {/* External link */}
        <button
          className="mt-1 p-1 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            window.open(visit.url, "_blank");
          }}
          title="Open in new window"
        >
          <ExternalLink className="size-4" />
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && details && (
        <div className="px-12 pb-3 space-y-3">
          {/* Full URL */}
          <div className="text-xs text-muted-foreground break-all">
            {visit.url}
          </div>

          {/* Screenshots */}
          {details.screenshots.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground">
                Screenshots ({details.screenshots.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {details.screenshots.slice(0, 4).map((screenshot) => (
                  <img
                    key={screenshot.id}
                    src={screenshot.image_data}
                    alt="Page screenshot"
                    className="w-full rounded border border-border"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Interactions details */}
          {details.interactions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground">
                Interactions ({details.interactions.length})
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {details.interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="p-2 rounded bg-muted/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground capitalize">
                        {interaction.type}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(interaction.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {interaction.selector && (
                      <div className="text-muted-foreground font-mono text-[10px] break-all">
                        {interaction.selector}
                      </div>
                    )}
                    {interaction.value !== null &&
                      interaction.value !== undefined &&
                      interaction.value !== "" && (
                        <div className="text-foreground">
                          {interaction.type === "input"
                            ? `Input: "${interaction.value}"`
                            : `Value: ${interaction.value}`}
                        </div>
                      )}
                    {(interaction.x !== null || interaction.y !== null) && (
                      <div className="text-muted-foreground">
                        Position: ({interaction.x}, {interaction.y})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scroll events */}
          {details.scrollEvents.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Scrolled {details.scrollEvents.length} times
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Time period section component
const TimePeriodSection: React.FC<{
  period: string;
  visits: HistoryPageVisit[];
  expandedVisitId: number | null;
  setExpandedVisitId: (id: number | null) => void;
  visitDetails: Map<number, HistoryVisitDetails>;
  interactionCounts: Map<number, number>;
}> = ({
  period,
  visits,
  expandedVisitId,
  setExpandedVisitId,
  visitDetails,
  interactionCounts,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="mb-6">
      <button
        className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
        <span>{period}</span>
        <span className="text-muted-foreground font-normal">
          ({visits.length})
        </span>
      </button>

      {!isCollapsed && (
        <div className="bg-background/50 border border-border rounded-lg overflow-hidden">
          {visits.map((visit) => (
            <VisitItem
              key={visit.id}
              visit={visit}
              onExpand={() =>
                setExpandedVisitId(
                  expandedVisitId === visit.id ? null : visit.id,
                )
              }
              isExpanded={expandedVisitId === visit.id}
              details={visitDetails.get(visit.id) || null}
              interactionCount={interactionCounts.get(visit.id) || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main History component
export const History: React.FC<HistoryProps> = ({ onExportWorkflow }) => {
  const [visits, setVisits] = useState<HistoryPageVisit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<HistoryPageVisit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVisitId, setExpandedVisitId] = useState<number | null>(null);
  const [visitDetails, setVisitDetails] = useState<
    Map<number, HistoryVisitDetails>
  >(new Map());
  const [interactionCounts, setInteractionCounts] = useState<
    Map<number, number>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [workflowAnalysis, setWorkflowAnalysis] =
    useState<WorkflowAnalysis | null>(null);
  const [analyzingWorkflow, setAnalyzingWorkflow] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Filter visits based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredVisits(
        visits.filter(
          (visit) =>
            visit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            visit.url.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );
    } else {
      setFilteredVisits(visits);
    }
  }, [searchQuery, visits]);

  // Load visit details when expanded
  useEffect(() => {
    if (expandedVisitId !== null) {
      // Always reload details when expanded to catch new interactions
      loadVisitDetails(expandedVisitId);
    }
  }, [expandedVisitId]);

  // Refresh details periodically if a visit is expanded
  useEffect(() => {
    if (expandedVisitId === null) return;

    const refreshInterval = setInterval(() => {
      loadVisitDetails(expandedVisitId);
    }, 1000); // Refresh every second while expanded

    return () => clearInterval(refreshInterval);
  }, [expandedVisitId]);

  const loadHistory = async (): Promise<void> => {
    try {
      setLoading(true);
      const recentVisits = await window.panelAPI.historyGetRecent(100);
      setVisits(recentVisits);

      // Load interaction counts for all visits
      const counts = new Map<number, number>();
      await Promise.all(
        recentVisits.map(async (visit) => {
          const count = await window.panelAPI.historyGetInteractionCount(
            visit.id,
          );
          counts.set(visit.id, count);
        }),
      );
      setInteractionCounts(counts);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVisitDetails = async (visitId: number): Promise<void> => {
    try {
      const details = await window.panelAPI.historyGetVisitDetails(visitId);
      if (details) {
        setVisitDetails((prev) => new Map(prev).set(visitId, details));

        // Also update the interaction count
        const count = details.interactions.length;
        setInteractionCounts((prev) => new Map(prev).set(visitId, count));
      }
    } catch (error) {
      console.error("Failed to load visit details:", error);
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (searchQuery.trim()) {
      try {
        const results = await window.panelAPI.historySearch(searchQuery, 100);
        setVisits(results);
      } catch (error) {
        console.error("Failed to search history:", error);
      }
    } else {
      loadHistory();
    }
  };

  const handleClearHistory = async (mode: "all" | "older"): Promise<void> => {
    const message =
      mode === "all"
        ? "Clear all history? This cannot be undone."
        : "Clear history older than 30 days? This cannot be undone.";

    const confirmed = confirm(message);
    if (confirmed) {
      try {
        if (mode === "all") {
          await window.panelAPI.historyClearAll();
        } else {
          await window.panelAPI.historyClearOld(30);
        }
        loadHistory();
      } catch (error) {
        console.error(`Failed to clear history (mode: ${mode}):`, error);
      }
    }
  };

  const handleAnalyzeWorkflow = async (): Promise<void> => {
    try {
      setAnalyzingWorkflow(true);
      const analysis = await window.panelAPI.workflowAnalyzeRecent({
        limit: 50,
      });
      setWorkflowAnalysis(analysis);
    } catch (error) {
      console.error("Failed to analyze workflow:", error);
    } finally {
      setAnalyzingWorkflow(false);
    }
  };

  const groupedVisits = groupVisitsByPeriod(filteredVisits);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">
            Browsing History
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadHistory}
              title="Refresh history"
            >
              <RefreshCw className="size-4" />
            </Button>
            {visits.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAnalyzeWorkflow}
                disabled={analyzingWorkflow}
                title="Analyze workflow with AI"
              >
                <Sparkles className="size-4 mr-1" />
                {analyzingWorkflow ? "Analyzing..." : "Analyze"}
              </Button>
            )}
            {onExportWorkflow && visits.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExportWorkflow(visits)}
              >
                Export Workflow
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" title="Clear history">
                  <Trash2 className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleClearHistory("older")}>
                  Clear older than 30 days
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleClearHistory("all")}
                >
                  Clear all history
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Workflow Analysis Results */}
        {workflowAnalysis && (
          <div className="border-b border-border bg-linear-to-br from-primary/5 to-primary/10 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  AI Workflow Analysis
                </h3>
              </div>
              <button
                onClick={() => setWorkflowAnalysis(null)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {/* Summary */}
              <div className="bg-background/60 rounded-lg p-3 border border-border/50">
                <p className="text-foreground font-medium mb-2">
                  📋 What You Did:
                </p>
                <p className="text-muted-foreground">
                  {workflowAnalysis.summary}
                </p>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-3 text-xs">
                <div className="bg-background/60 rounded px-3 py-2 border border-border/50">
                  <span className="text-muted-foreground">Repeatability: </span>
                  <span className="font-bold text-primary">
                    {workflowAnalysis.repeatabilityScore}%
                  </span>
                </div>
                <div className="bg-background/60 rounded px-3 py-2 border border-border/50">
                  <span className="text-muted-foreground">Automation: </span>
                  <span className="font-bold text-primary capitalize">
                    {workflowAnalysis.automationPotential}
                  </span>
                </div>
                <div className="bg-background/60 rounded px-3 py-2 border border-border/50">
                  <span className="text-muted-foreground">Steps: </span>
                  <span className="font-bold text-primary">
                    {workflowAnalysis.steps.length}
                  </span>
                </div>
              </div>

              {/* URLs */}
              {workflowAnalysis.urls && workflowAnalysis.urls.length > 0 && (
                <div className="bg-background/60 rounded-lg p-3 border border-border/50">
                  <p className="font-medium text-foreground mb-2">
                    🌐 Sites Visited:
                  </p>
                  <div className="space-y-1">
                    {workflowAnalysis.urls.slice(0, 3).map((url, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-muted-foreground truncate"
                      >
                        • {new URL(url).hostname}
                      </div>
                    ))}
                    {workflowAnalysis.urls.length > 3 && (
                      <div className="text-xs text-muted-foreground italic">
                        ... and {workflowAnalysis.urls.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Steps */}
              {workflowAnalysis.steps.length > 0 && (
                <div className="bg-background/60 rounded-lg p-3 border border-border/50">
                  <p className="font-medium text-foreground mb-2">
                    📝 Step-by-Step:
                  </p>
                  <ol className="space-y-2">
                    {workflowAnalysis.steps.slice(0, 8).map((step, idx) => (
                      <li key={idx} className="flex gap-2 text-xs">
                        <span className="font-medium text-primary min-w-[20px]">
                          {idx + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="text-foreground">{step.action}</div>
                          {step.target && (
                            <div className="text-muted-foreground text-[11px] mt-0.5 truncate">
                              → {step.target}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                    {workflowAnalysis.steps.length > 8 && (
                      <li className="text-xs text-muted-foreground italic pl-6">
                        ... {workflowAnalysis.steps.length - 8} more steps
                      </li>
                    )}
                  </ol>
                </div>
              )}

              {/* Help text */}
              <div className="text-xs text-muted-foreground italic text-center pt-2">
                💡 This workflow could be automated or used to create an agent
                prompt
              </div>
            </div>
          </div>
        )}

        {/* History timeline */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading history...</div>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="size-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No results found" : "No history yet"}
                </p>
              </div>
            </div>
          ) : (
            <div>
              {Array.from(groupedVisits.entries()).map(
                ([period, periodVisits]) => (
                  <TimePeriodSection
                    key={period}
                    period={period}
                    visits={periodVisits}
                    expandedVisitId={expandedVisitId}
                    setExpandedVisitId={setExpandedVisitId}
                    visitDetails={visitDetails}
                    interactionCounts={interactionCounts}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
