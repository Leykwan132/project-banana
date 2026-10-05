import { insightDays, insightMetrics, type InsightWindow } from "./instagramInsightWindows";
import { normalizeProfile } from "./mediaKitModel";

export type InstagramProvider = "SCRAPING" | "META_OFFICIAL";
export async function hashState(state: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export function instagramProvider(value = process.env.INSTAGRAM_DATA_PROVIDER): InstagramProvider {
  if (value === undefined || value === "SCRAPING") return "SCRAPING";
  if (value === "META_OFFICIAL") return value;
  throw Error("Set INSTAGRAM_DATA_PROVIDER to SCRAPING or META_OFFICIAL.");
}
export function accountForProvider<T extends { platform?: string; snapshot?: unknown; last_success_at?: number; official_snapshot?: unknown; official_success_at?: number; refresh_available_at?: number; official_refresh_available_at?: number }>(account: T, provider: InstagramProvider): T {
  if (account.platform === "tiktok" || provider === "SCRAPING") return account;
  return { ...account, snapshot: account.official_snapshot, last_success_at: account.official_success_at, refresh_available_at: account.official_refresh_available_at ?? 0 } as T;
}
export function callbackUrl(siteUrl: string): string {
  const url = new URL(siteUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/") throw Error("Configure a valid CONVEX_SITE_URL.");
  return `${url.origin}/oauth/instagram/callback`;
}
export function authorizationUrl(appId: string, siteUrl: string, state: string): string {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.search = new URLSearchParams({ client_id: appId, redirect_uri: callbackUrl(siteUrl), response_type: "code", force_reauth: "true", scope: "instagram_business_basic,instagram_business_manage_insights", state }).toString();
  return url.toString();
}
export class MetaApiError extends Error {
  code: number;
  status: number;
  constructor(code: number, status: number) { super("Instagram API request failed."); this.code = code; this.status = status; }
}
export function safeMetaError(error: unknown): string {
  if (error instanceof MetaApiError) {
    if (error.code === 190) return "Reconnect Instagram to renew access to your insights.";
    if ([10, 200].includes(error.code) || error.status === 403) return "Instagram insights permission is missing. Reconnect and allow insights access.";
    if ([4, 17, 32, 613].includes(error.code) || error.status === 429) return "Instagram is limiting requests. Your previous data is saved; please try later.";
  }
  return "Instagram data is temporarily unavailable. Your previous data is saved; please try later.";
}
export async function metaRequest(url: string, options: RequestInit = {}): Promise<Record<string, any>> {
  const response = await fetch(url, { ...options, redirect: "error", signal: AbortSignal.timeout(15000) });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new MetaApiError(Number(payload.error?.code ?? 0), response.status);
  return payload;
}
export async function graphRequest(path: string, token: string, params: Record<string, string> = {}) {
  const version = process.env.INSTAGRAM_GRAPH_API_VERSION ?? "v25.0";
  if (!/^v\d+\.0$/.test(version)) throw Error("Invalid Instagram API version.");
  const url = new URL(`https://graph.instagram.com/${version}/${path}`);
  url.search = new URLSearchParams(params).toString();
  return metaRequest(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
}
export function metricTotal(payload: Record<string, any>, name: string): number | undefined {
  const metric = Array.isArray(payload.data) ? payload.data.find((item: any) => item.name === name) : undefined;
  const value = metric?.total_value?.value ?? (metric?.values?.length === 1 ? metric.values[0].value : undefined);
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
export function normalizeOfficialProfile(profile: Record<string, any>, media: Record<string, any>[], expectedHandle: string) {
  // Reuse presentation calculations while preserving unavailable official fields.
  const snapshot = normalizeProfile({
    username: typeof profile.username === "string" ? profile.username.toLowerCase() : "",
    fullName: profile.name, biography: profile.biography, followersCount: profile.followers_count,
    postsCount: profile.media_count, profilePicUrl: profile.profile_picture_url,
    latestPosts: media.slice(0, 12).map(item => {
      let code: string | undefined;
      try {
        const url = new URL(item.permalink);
        if (url.protocol === "https:" && ["instagram.com", "www.instagram.com"].includes(url.hostname)) {
          code = /^\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1];
        }
      } catch { /* Missing permalinks aren't valid public post links. */ }
      return { id: item.id, shortCode: code, caption: item.caption, timestamp: item.timestamp, type: item.media_type === "VIDEO" ? "Video" : "Image",
        likesCount: item.like_count, commentsCount: item.comments_count,
        ...(item.media_type === "VIDEO" ? { videoViewCount: item.views } : {}),
        displayUrl: item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url };
    }),
  }, expectedHandle);
  for (const post of snapshot.posts) {
    const original = media.find(item => String(item.id) === post.id);
    if (original?.permalink) post.url = original.permalink;
  }
  return snapshot;
}
export async function fetchOfficialData(instagramUserId: string, token: string, handle: string, now = Date.now()) {
  if (!/^\d+$/.test(instagramUserId)) throw Error("Invalid Instagram account ID.");
  const deadline = Date.now() + 120000;
  const profile = await graphRequest(instagramUserId, token, { fields: "user_id,username,name,biography,profile_picture_url,followers_count,media_count" });
  const mediaResponse = await graphRequest(`${instagramUserId}/media`, token, { fields: "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count", limit: "12" });
  const media: Record<string, any>[] = Array.isArray(mediaResponse.data) ? mediaResponse.data.slice(0, 12) : [];
  const until = Math.floor(now / 1000), since = until - 30 * 86400;
  const insights: { since: number; until: number; fetched_at: number; unavailable: string[]; media: { id: string; views?: number; reach?: number; shares?: number; saved?: number }[]; views?: number; reach?: number; accounts_engaged?: number; total_interactions?: number; likes?: number; comments?: number; shares?: number; saves?: number; windows?: InsightWindow[] } = { since, until, fetched_at: now, unavailable: [], media: [] };
  const metric = async (path: string, name: string, params: Record<string, string>) => {
    if (Date.now() >= deadline) throw Error("Instagram insights refresh timed out.");
    try { return metricTotal(await graphRequest(`${path}/insights`, token, { ...params, metric: name }), name); }
    catch (error) {
      // Only an unsupported metric can be omitted. Authorization/rate-limit failures must be visible.
      if (error instanceof MetaApiError && error.code === 100) return undefined;
      throw error;
    }
  };
  const windows: InsightWindow[] = [];
  // Request whole ranges directly: unique reach and engaged accounts cannot be summed across days.
  // Longer ranges are exposed only when Meta actually returns data for them.
  for (const days of insightDays) {
    const window: InsightWindow = { days, since: until - days * 86400, until, fetched_at: now, unavailable: [] };
    for (let offset = 0; offset < insightMetrics.length; offset += 3) {
      await Promise.all(insightMetrics.slice(offset, offset + 3).map(async name => {
        const value = await metric(instagramUserId, name, { period: "day", metric_type: "total_value", since: String(window.since), until: String(until) });
        if (value === undefined) window.unavailable.push(name);
        else window[name] = value;
      }));
    }
    if (insightMetrics.some(name => window[name] !== undefined)) windows.push(window);
    if (days === 30) {
      insights.unavailable = window.unavailable;
      for (const name of insightMetrics) if (window[name] !== undefined) insights[name] = window[name];
    }
  }
  insights.windows = windows;
  for (const item of media) {
    if (typeof item.id !== "string" || !/^\d+$/.test(item.id)) continue;
    const totals: typeof insights.media[number] = { id: item.id };
    for (const name of ["views", "reach", "shares", "saved"] as const) {
      const value = await metric(item.id, name, {});
      if (value !== undefined) totals[name] = value;
    }
    if (totals.views !== undefined) item.views = totals.views;
    insights.media.push(totals);
  }
  return { snapshot: normalizeOfficialProfile(profile, media, handle), insights };
}
