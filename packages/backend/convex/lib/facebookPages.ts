import { MetaApiError, metaRequest } from "./instagramOfficial";

export function facebookCallbackUrl(site: string): string {
  const url = new URL(site);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/") throw Error("Configure a valid CONVEX_SITE_URL.");
  return `${url.origin}/oauth/facebook/callback`;
}
export function facebookAuthorizationUrl(appId: string, site: string, state: string): string {
  const url = new URL("https://www.facebook.com/v25.0/dialog/oauth");
  url.search = new URLSearchParams({ client_id: appId, redirect_uri: facebookCallbackUrl(site), response_type: "code", scope: "pages_show_list,pages_read_engagement,read_insights", state }).toString();
  return url.toString();
}
export function facebookGraphUrl(path: string, params: Record<string, string> = {}): URL {
  const version = process.env.META_GRAPH_API_VERSION ?? "v25.0";
  if (!/^v\d+\.0$/.test(version) || !/^[a-zA-Z0-9_/]+$/.test(path)) throw Error("Invalid Facebook API configuration.");
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  url.search = new URLSearchParams(params).toString();
  return url;
}
export async function facebookGraph(path: string, token: string, params: Record<string, string> = {}) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw Error("Facebook Page insights are not configured.");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(token));
  const proof = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
  return metaRequest(facebookGraphUrl(path, { ...params, appsecret_proof: proof }).toString(), { headers: { Authorization: `Bearer ${token}` } });
}
export function safeFacebookError(error: unknown): string {
  if (error instanceof MetaApiError) {
    if (error.code === 190) return "Reconnect Facebook to renew access to this Page.";
    if ([10, 200].includes(error.code) || error.status === 403) return "Reconnect Facebook and allow Page insights access.";
    if ([4, 17, 32, 613].includes(error.code) || error.status === 429) return "Facebook is limiting requests. Your previous insights are saved; try later.";
  }
  return "Facebook Page insights are temporarily unavailable. Your previous insights are saved; try later.";
}
const count = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
export async function fetchPageInsights(pageId: string, token: string, now = Date.now()) {
  if (!/^\d+$/.test(pageId)) throw Error("Invalid Page ID.");
  const profile = await facebookGraph(pageId, token, { fields: "id,name,followers_count,fan_count" });
  if (String(profile.id) !== pageId) throw Error("Page identity mismatch.");
  // Closed UTC days avoid presenting an incomplete day as a complete daily total.
  const until = Math.floor(now / 86400000) * 86400, since = until - 30 * 86400;
  const followers = count(profile.followers_count), pageLikes = count(profile.fan_count);
  const result: { fetched_at: number; since: number; until: number; followers?: number; page_likes?: number; media_views?: number; daily_views: { end_time: string; value: number }[]; unavailable: string[] } = {
    fetched_at: now, since, until, daily_views: [], unavailable: [],
    ...(followers !== undefined ? { followers } : {}), ...(pageLikes !== undefined ? { page_likes: pageLikes } : {}),
  };
  if (followers === undefined) result.unavailable.push("followers");
  if (pageLikes === undefined) result.unavailable.push("page_likes");
  try {
    const data = await facebookGraph(`${pageId}/insights`, token, { metric: "page_media_view", period: "day", since: String(since), until: String(until) });
    const metric = Array.isArray(data.data) ? data.data.find((item: any) => item.name === "page_media_view" && item.period === "day") : null;
    const values = metric?.values;
    if (Array.isArray(values) && values.length && values.every((item: any) => count(item.value) !== undefined && typeof item.end_time === "string")) {
      result.daily_views = values.map((item: any) => ({ end_time: item.end_time, value: item.value }));
      result.media_views = result.daily_views.reduce((sum, item) => sum + item.value, 0);
    }
  } catch (error) {
    if (!(error instanceof MetaApiError && error.code === 100)) throw error;
  }
  if (result.media_views === undefined) result.unavailable.push("media_views");
  return result;
}
