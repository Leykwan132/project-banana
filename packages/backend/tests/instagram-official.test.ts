import { expect, test } from "bun:test";
import { instagramProvider, accountForProvider, authorizationUrl, normalizeOfficialProfile, metricTotal, safeMetaError, MetaApiError, fetchOfficialData } from "../convex/lib/instagramOfficial";

test("provider switch preserves scraping by default and rejects misconfiguration", () => {
  expect(instagramProvider(undefined)).toBe("SCRAPING");
  expect(instagramProvider("META_OFFICIAL")).toBe("META_OFFICIAL");
  expect(instagramProvider("SCRAPING")).toBe("SCRAPING");
  expect(() => instagramProvider("typo")).toThrow("INSTAGRAM_DATA_PROVIDER");
});
test("provider projection uses separate snapshots without deleting either source", () => {
  const account = { platform: "instagram", snapshot: { displayName: "Scraped" }, last_success_at: 1, official_snapshot: { displayName: "Official" }, official_success_at: 2 };
  expect(accountForProvider(account, "SCRAPING").snapshot?.displayName).toBe("Scraped");
  expect(accountForProvider(account, "META_OFFICIAL").snapshot?.displayName).toBe("Official");
  expect(account.snapshot.displayName).toBe("Scraped");
  expect(accountForProvider({ ...account, official_snapshot: undefined }, "META_OFFICIAL").snapshot).toBeUndefined();
  expect(accountForProvider({ ...account, platform: "tiktok" }, "META_OFFICIAL").snapshot?.displayName).toBe("Scraped");
});
test("login URL uses the registered Instagram callback, minimal scopes, and unique state", () => {
  const url = new URL(authorizationUrl("1451111847122256", "https://basic-mule-595.convex.site", "opaque-state"));
  expect(url.origin).toBe("https://www.instagram.com");
  expect(url.searchParams.get("redirect_uri")).toBe("https://basic-mule-595.convex.site/oauth/instagram/callback");
  expect(url.searchParams.get("scope")).toBe("instagram_business_basic,instagram_business_manage_insights");
  expect(url.searchParams.get("state")).toBe("opaque-state");
});
test("official normalization preserves missing counts and rejects a mismatched identity", () => {
  const profile = normalizeOfficialProfile({ username: "sample", followers_count: 100, media_count: 2, name: "Sample" }, [
    { id: "123", permalink: "https://www.instagram.com/reel/ABC/", caption: "Hello", media_type: "VIDEO", like_count: 5, comments_count: 1, views: 80 },
    { id: "124", permalink: "https://www.instagram.com/p/DEF/", media_type: "IMAGE" },
  ], "sample");
  expect(profile.followers).toBe(100);
  expect(profile.engagementRate).toBe(6);
  expect(profile.averageVideoViews).toBe(80);
  expect(profile.posts[1].likes).toBeUndefined();
  expect(profile.verified).toBe(false);
  expect(() => normalizeOfficialProfile({ username: "other" }, [], "sample")).toThrow();
});
test("insights totals accept actual zero and leave empty metrics unavailable", () => {
  expect(metricTotal({ data: [{ name: "views", total_value: { value: 0 } }] }, "views")).toBe(0);
  expect(metricTotal({ data: [] }, "views")).toBeUndefined();
  expect(metricTotal({ data: [{ name: "reach", values: [{ value: 100 }, { value: 100 }] }] }, "reach")).toBeUndefined();
});
test("safe Meta errors never expose upstream tokens or raw messages", () => {
  expect(safeMetaError(new Error("SECRET_TOKEN in request URL"))).not.toContain("SECRET_TOKEN");
  expect(safeMetaError(new MetaApiError(190, 400))).toContain("Reconnect");
  expect(safeMetaError(new MetaApiError(10, 403))).toContain("permission");
});
test("official API fetch keeps valid data when one metric is unsupported and sends tokens only to Meta", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    expect(url.origin).toBe("https://graph.instagram.com");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer PRIVATE");
    let body: unknown;
    if (url.pathname.endsWith("/media")) body = { data: [{ id: "456", permalink: "https://www.instagram.com/reel/ABC/", media_type: "VIDEO", like_count: 5, comments_count: 1 }] };
    else if (url.pathname.endsWith("/insights")) {
      const metric = url.searchParams.get("metric")!;
      if (metric === "saved") return new Response(JSON.stringify({ error: { code: 100 } }), { status: 400 });
      body = { data: [{ name: metric, total_value: { value: metric === "views" ? 200 : 20 } }] };
    } else body = { user_id: "123", username: "sample", followers_count: 100 };
    return new Response(JSON.stringify(body));
  }) as typeof fetch;
  try {
    const data = await fetchOfficialData("123", "PRIVATE", "sample", 1760000000000);
    expect(data.snapshot.averageVideoViews).toBe(200);
    expect(data.insights.views).toBe(200);
    expect(data.insights.media[0].saved).toBeUndefined();
    expect(data.insights.media[0].reach).toBe(20);
    expect(data.insights.until - data.insights.since).toBe(30 * 86400);
  } finally { globalThis.fetch = previous; }
});
