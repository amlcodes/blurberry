export interface HistorySettingsConfig {
  enabled: boolean;
  excludedDomains: string[];
  autoPurgeDays: number;
  screenshotQuality: "low" | "medium" | "high";
  trackInteractions: boolean;
  trackScrollEvents: boolean;
  trackClipboard: boolean;
}

export class HistorySettings {
  private settings: HistorySettingsConfig;

  constructor() {
    // Privacy-first defaults
    this.settings = {
      enabled: true,
      excludedDomains: [
        "accounts.google.com",
        "login.live.com",
        "signin.aws.amazon.com",
        // Add more sensitive domains
      ],
      autoPurgeDays: 30, // Auto-delete history older than 30 days
      screenshotQuality: "medium",
      trackInteractions: true,
      trackScrollEvents: true,
      trackClipboard: false, // Disabled by default for privacy
    };
  }

  // Getters
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  getExcludedDomains(): string[] {
    return [...this.settings.excludedDomains];
  }

  getAutoPurgeDays(): number {
    return this.settings.autoPurgeDays;
  }

  getScreenshotQuality(): "low" | "medium" | "high" {
    return this.settings.screenshotQuality;
  }

  shouldTrackInteractions(): boolean {
    return this.settings.trackInteractions;
  }

  shouldTrackScrollEvents(): boolean {
    return this.settings.trackScrollEvents;
  }

  shouldTrackClipboard(): boolean {
    return this.settings.trackClipboard;
  }

  // Setters
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
  }

  addExcludedDomain(domain: string): void {
    if (!this.settings.excludedDomains.includes(domain)) {
      this.settings.excludedDomains.push(domain);
    }
  }

  removeExcludedDomain(domain: string): void {
    this.settings.excludedDomains = this.settings.excludedDomains.filter(
      (d) => d !== domain,
    );
  }

  setAutoPurgeDays(days: number): void {
    this.settings.autoPurgeDays = Math.max(1, days);
  }

  setScreenshotQuality(quality: "low" | "medium" | "high"): void {
    this.settings.screenshotQuality = quality;
  }

  setTrackInteractions(track: boolean): void {
    this.settings.trackInteractions = track;
  }

  setTrackScrollEvents(track: boolean): void {
    this.settings.trackScrollEvents = track;
  }

  setTrackClipboard(track: boolean): void {
    this.settings.trackClipboard = track;
  }

  // Check if domain should be excluded
  isDomainExcluded(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return this.settings.excludedDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  }

  // Export/Import settings
  toJSON(): HistorySettingsConfig {
    return { ...this.settings };
  }

  fromJSON(config: Partial<HistorySettingsConfig>): void {
    this.settings = {
      ...this.settings,
      ...config,
    };
  }
}

