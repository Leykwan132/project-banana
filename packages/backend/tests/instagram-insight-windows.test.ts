import { expect, test } from "bun:test";
import { projectInsightWindows, rangeEngagement } from "../convex/lib/instagramInsightWindows";

test("range engagement uses interactions divided by views and preserves unavailable values", () => {
  expect(rangeEngagement({ views: 743, total_interactions: 74 })).toBeCloseTo(9.9596, 3);
  expect(rangeEngagement({ views: 0, total_interactions: 0 })).toBeUndefined();
  expect(rangeEngagement({ views: 10 })).toBeUndefined();
});
test("public window projection respects hidden metrics and excludes private insight fields", () => {
  const result = projectInsightWindows([{ days: 30, since: 1, until: 2, fetched_at: 3, views: 743, reach: 511, total_interactions: 74, likes: 22, comments: 3, shares: 23, saves: 3, unavailable: [] }], { views: false, engagementRate: true });
  expect(result[0].views).toBeUndefined();
  expect(result[0].engagementRate).toBeUndefined();
  expect(result[0].reach).toBe(511);
  expect(result[0].likes).toBe(22);
  expect(result[0]).not.toHaveProperty("unavailable");
});

test("legacy insights without range metadata are not published as selectable windows", () => {
  expect(projectInsightWindows([{ views: 999999 } as any], {})).toEqual([]);
});

test("official fetch collects useful metrics for supported ranges and omits rejected ranges", async () => {
  const { fetchOfficialData } = await import("../convex/lib/instagramOfficial");
  const original = globalThis.fetch;
  const requested = new Set<string>();
  globalThis.fetch = (async (input: any, options: any) => {
    const url = new URL(String(input));
    expect(url.hostname).toBe("graph.instagram.com");
    expect(options.headers.Authorization).toBe("Bearer PRIVATE_TOKEN");
    expect(url.searchParams.has("access_token")).toBe(false);
    if (url.pathname.endsWith("/media")) return Response.json({ data: [] });
    if (!url.pathname.endsWith("/insights")) return Response.json({ username: "sample", followers_count: 5, media_count: 3 });
    const metric = url.searchParams.get("metric")!;
    const days = (Number(url.searchParams.get("until")) - Number(url.searchParams.get("since"))) / 86400;
    requested.add(`${days}:${metric}`);
    if (days > 30) return Response.json({ error: { code: 100 } }, { status: 400 });
    return Response.json({ data: [{ name: metric, total_value: { value: metric === "likes" ? 0 : days } }] });
  }) as typeof fetch;
  try {
    const { insights } = await fetchOfficialData("123", "PRIVATE_TOKEN", "sample", 1760000000000);
    expect(insights.windows?.map(window => window.days)).toEqual([7, 14, 30]);
    expect(insights.windows?.[0].likes).toBe(0);
    expect(insights.windows?.[0].reach).toBe(7);
    expect(insights.windows?.[2].reach).toBe(30);
    expect(requested.has("30:shares")).toBe(true);
    expect(requested.has("30:saves")).toBe(true);
    expect([...requested].some(key => key.includes("follows"))).toBe(false);
  } finally { globalThis.fetch = original; }
});

test("public kits expose projected windows while respecting creator visibility", async () => {
  const { call, mediaKitContext } = await import("./helpers/mediaKitContext");
  const { getPublic } = await import("../convex/mediaKits");
  const { defaultMetrics, normalizeProfile } = await import("../convex/lib/mediaKitModel");
  const original = process.env.INSTAGRAM_DATA_PROVIDER;
  process.env.INSTAGRAM_DATA_PROVIDER = "META_OFFICIAL";
  try {
    const ctx = mediaKitContext();
    const kitId = await ctx.db.insert("media_kits", { creator_id: "creator-1", slug: "official-kit", is_published: true, display_name: "Owner", bio: "", category: "", rates: [], contacts: [] });
    await ctx.db.insert("media_kit_accounts", {
      kit_id: kitId, handle: "sample", platform: "instagram", is_visible: true,
      metric_visibility: { ...defaultMetrics, views: false, shares: false },
      official_snapshot: normalizeProfile({ username: "sample", followersCount: 5 }, "sample"),
      official_insights: { since: 1, until: 2592001, fetched_at: 3, views: 743, total_interactions: 74, likes: 0, shares: 23, unavailable: [], media: [] },
    });
    const result = await call(getPublic, ctx, { slug: "official-kit" });
    const window = result.accounts[0].insightWindows[0];
    expect(window.days).toBe(30);
    expect(window.views).toBeUndefined();
    expect(window.shares).toBeUndefined();
    expect(window.engagementRate).toBeUndefined();
    expect(window.likes).toBe(0);
    expect(JSON.stringify(result)).not.toContain("official_insights");
    expect(JSON.stringify(result)).not.toContain("unavailable");
  } finally {
    if (original === undefined) delete process.env.INSTAGRAM_DATA_PROVIDER;
    else process.env.INSTAGRAM_DATA_PROVIDER = original;
  }
});
