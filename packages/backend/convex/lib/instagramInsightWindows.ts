export const insightMetrics = ["views", "reach", "accounts_engaged", "total_interactions", "likes", "comments", "shares", "saves"] as const;
export const insightDays = [7, 14, 30, 60, 90] as const;
export type InsightWindow = {
  days: number; since: number; until: number; fetched_at: number; unavailable: string[];
} & Partial<Record<typeof insightMetrics[number], number>>;
const publicKeys = {
  views: "views", reach: "reach", accounts_engaged: "accountsEngaged", total_interactions: "totalInteractions",
  likes: "likes", comments: "comments", shares: "shares", saves: "saves",
} as const;
export function rangeEngagement(window: Partial<InsightWindow>): number | undefined {
  return window.views !== undefined && window.views > 0 && window.total_interactions !== undefined
    ? window.total_interactions / window.views * 100 : undefined;
}
export function projectInsightWindows(windows: InsightWindow[], visibility: Record<string, boolean | undefined>) {
  return windows.filter(window => Number.isFinite(window.days) && window.days > 0
    && Number.isFinite(window.since) && Number.isFinite(window.until) && window.until > window.since
    && Number.isFinite(window.fetched_at)).map(window => {
    const metrics: Partial<Record<typeof publicKeys[keyof typeof publicKeys] | "engagementRate", number>> = {};
    const visibleMetrics: string[] = [];
    for (const name of insightMetrics) {
      const key = publicKeys[name];
      if (visibility[key] === false) continue;
      visibleMetrics.push(key);
      if (window[name] !== undefined) metrics[key] = window[name];
    }
    if (visibility.engagementRate !== false && visibility.views !== false && visibility.totalInteractions !== false) {
      visibleMetrics.push("engagementRate");
      const rate = rangeEngagement(window);
      if (rate !== undefined) metrics.engagementRate = rate;
    }
    return { days: window.days, since: window.since, until: window.until, updatedAt: window.fetched_at, visibleMetrics, ...metrics };
  });
}
