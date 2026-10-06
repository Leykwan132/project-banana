import { expect, test } from "bun:test";
import { getFunctionName } from "convex/server";
import { call, mediaKitContext } from "./helpers/mediaKitContext";
import { startLogin, consumeState, saveChoices, getEditor, selectPage, disconnect, claimRefresh, finishRefresh, requestRefresh } from "../convex/facebookPages";
import { completeLogin, oauthCallback, refreshPage } from "../convex/facebookPageActions";
import { facebookAuthorizationUrl, fetchPageInsights } from "../convex/lib/facebookPages";

function configure() {
  process.env.META_APP_ID = "123";
  process.env.META_APP_SECRET = "PRIVATE_SECRET";
  process.env.CONVEX_SITE_URL = "https://basic-mule-595.convex.site";
  process.env.SITE_URL = "https://lumina-app.my";
}
async function connected(ctx: any) {
  await call(saveChoices, ctx, { creatorId: "creator-1", pages: [{ id: "123", name: "My Page", token: "PRIVATE_TOKEN" }] });
  return call(selectPage, ctx, { pageId: "123" });
}
test("Facebook login uses its own callback and only Page insights permissions", async () => {
  configure();
  const url = new URL(facebookAuthorizationUrl("123", process.env.CONVEX_SITE_URL!, "random"));
  expect(url.searchParams.get("redirect_uri")).toBe("https://basic-mule-595.convex.site/oauth/facebook/callback");
  expect(url.searchParams.get("scope")).toBe("pages_show_list,pages_read_engagement,read_insights");
  expect(url.searchParams.get("state")).toBe("random");
  await expect(call(startLogin, mediaKitContext(null))).rejects.toThrow("Sign in");
});
test("Facebook OAuth state rejects expiry and replay", async () => {
  configure();
  const ctx = mediaKitContext();
  await call(startLogin, ctx);
  const state = [...ctx.rows.values()].find((row: any) => row.table === "facebook_oauth_states");
  expect(await call(consumeState, ctx, { stateHash: state.state_hash })).toBe("creator-1");
  expect(await call(consumeState, ctx, { stateHash: state.state_hash })).toBeNull();
  await call(startLogin, ctx);
  const expired = [...ctx.rows.values()].find((row: any) => row.table === "facebook_oauth_states");
  expired.expires_at = 0;
  expect(await call(consumeState, ctx, { stateHash: expired.state_hash })).toBeNull();
});
test("Page picker and editor never expose credentials and require owner selection", async () => {
  const ctx = mediaKitContext();
  await call(saveChoices, ctx, { creatorId: "creator-1", pages: [{ id: "123", name: "My Page", token: "PRIVATE_TOKEN" }] });
  expect(JSON.stringify(await call(getEditor, ctx, { now: Date.now() }))).not.toContain("PRIVATE_TOKEN");
  await expect(call(selectPage, ctx, { pageId: "456" })).rejects.toThrow("Choose");
  const id = await call(selectPage, ctx, { pageId: "123" });
  expect(JSON.stringify(await call(getEditor, ctx, { now: Date.now() }))).not.toContain("PRIVATE_TOKEN");
  ctx.auth.getUserIdentity = async () => ({ subject: "stranger" });
  await expect(call(disconnect, ctx, { connectionId: id })).rejects.toThrow();
});
test("expired Page choices cannot be selected", async () => {
  const ctx = mediaKitContext();
  await call(saveChoices, ctx, { creatorId: "creator-1", pages: [{ id: "123", name: "Page", token: "PRIVATE_TOKEN" }] });
  [...ctx.rows.values()].find((row: any) => row.table === "facebook_page_choices").expires_at = 0;
  expect((await call(getEditor, ctx, { now: Date.now() })).choices).toEqual([]);
  await expect(call(selectPage, ctx, { pageId: "123" })).rejects.toThrow("expired");
});
test("refresh claim is unique and disconnect prevents late results", async () => {
  const ctx = mediaKitContext();
  const id = await connected(ctx);
  const row = ctx.rows.get(id);
  const args = { connectionId: id, generation: row.generation, refreshId: row.refresh_id };
  expect(await call(claimRefresh, ctx, args)).not.toBeNull();
  expect(await call(claimRefresh, ctx, args)).toBeNull();
  await call(disconnect, ctx, { connectionId: id });
  expect(await call(finishRefresh, ctx, { ...args, snapshot: { fetched_at: Date.now(), since: 1, until: 2, unavailable: [], daily_views: [], followers: 12 } })).toBe(false);
  expect(ctx.rows.has(id)).toBe(false);
});
test("reconnect invalidates previous refresh and errors preserve successful data", async () => {
  const ctx = mediaKitContext();
  const id = await connected(ctx);
  const old = { ...ctx.rows.get(id) };
  await connected(ctx);
  expect(await call(finishRefresh, ctx, { connectionId: id, generation: old.generation, refreshId: old.refresh_id, error: "old failure" })).toBe(false);
  const current = ctx.rows.get(id);
  const args = { connectionId: id, generation: current.generation, refreshId: current.refresh_id };
  const snapshot = { fetched_at: Date.now(), since: 1, until: 2, unavailable: [], daily_views: [], followers: 12 };
  await call(finishRefresh, ctx, { ...args, snapshot });
  current.refresh_available_at = 0;
  await call(requestRefresh, ctx, { connectionId: id });
  await call(finishRefresh, ctx, { connectionId: id, generation: current.generation, refreshId: current.refresh_id, error: "Reconnect Facebook", reconnect: true });
  expect(ctx.rows.get(id).snapshot).toEqual(snapshot);
  expect(ctx.rows.get(id).access_token).toBe("");
  expect(ctx.rows.get(id).status).toBe("reconnect_required");
});
test("Page views aggregate only numeric daily values and requests remain on Meta", async () => {
  configure();
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, options: any) => {
    const url = new URL(String(input));
    expect(url.origin).toBe("https://graph.facebook.com");
    expect(options.headers.Authorization).toBe("Bearer PRIVATE_TOKEN");
    expect(url.searchParams.has("access_token")).toBe(false);
    if (url.pathname.endsWith("/insights")) {
      if (url.searchParams.get("metric") !== "page_media_view") return Response.json({ data: [] });
      return Response.json({ data: [{ name: "page_media_view", period: "day", values: [{ value: 0, end_time: "2026-10-03T00:00:00Z" }, { value: 8, end_time: "2026-10-04T00:00:00Z" }] }] });
    }
    return Response.json({ id: "123", name: "Page", followers_count: 12 });
  }) as typeof fetch;
  try {
    const result = await fetchPageInsights("123", "PRIVATE_TOKEN");
    expect(result.media_views).toBe(8);
    expect(result.followers).toBe(12);
    expect(result.page_likes).toBeUndefined();
    expect(result.unavailable).toContain("page_likes");
    expect(result.daily_views).toHaveLength(2);
  } finally { globalThis.fetch = oldFetch; }
});
test("unsupported Page metrics stay unavailable and permission failures remain errors", async () => {
  configure();
  const oldFetch = globalThis.fetch;
  let code = 100;
  globalThis.fetch = (async (input: any) => String(input).includes("/insights?") ? Response.json({ error: { code } }, { status: 400 }) : Response.json({ id: "123", name: "Page" })) as typeof fetch;
  try {
    expect((await fetchPageInsights("123", "TOKEN")).media_views).toBeUndefined();
    code = 190;
    await expect(fetchPageInsights("123", "TOKEN")).rejects.toThrow();
  } finally { globalThis.fetch = oldFetch; }
});
test("Facebook callback stores paginated Page choices and refuses replay", async () => {
  configure();
  const ctx = mediaKitContext();
  ctx.runMutation = async (ref: any, args: any) => {
    const name = getFunctionName(ref);
    if (name === "facebookPages:consumeState") return call(consumeState, ctx, args);
    if (name === "facebookPages:saveChoices") return call(saveChoices, ctx, args);
    throw Error(name);
  };
  const { url } = await call(startLogin, ctx);
  const state = new URL(url).searchParams.get("state")!;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const u = new URL(String(input));
    if (u.pathname.endsWith("/oauth/access_token")) return Response.json({ access_token: "USER_PRIVATE", expires_in: 5184000 });
    if (u.pathname.endsWith("/me/permissions")) return Response.json({ data: ["pages_show_list", "pages_read_engagement", "read_insights"].map(permission => ({ permission, status: "granted" })) });
    if (!u.searchParams.has("after")) return Response.json({ data: [{ id: "123", name: "Page", access_token: "PAGE_PRIVATE" }], paging: { cursors: { after: "CURSOR" }, next: "https://evil.test/never-follow" } });
    expect(u.hostname).toBe("graph.facebook.com");
    return Response.json({ data: [{ id: "456", name: "Second Page", access_token: "SECOND_PRIVATE" }] });
  }) as typeof fetch;
  try {
    expect(await call(completeLogin, ctx, { state, code: "CODE", denied: false })).toBe("choose_page");
    expect((await call(getEditor, ctx, { now: Date.now() })).choices).toHaveLength(2);
    expect(await call(completeLogin, ctx, { state, code: "CODE", denied: false })).toBe("invalid_state");
  } finally { globalThis.fetch = oldFetch; }
});
test("Facebook login rejects declined insights access before saving Page tokens", async () => {
  configure();
  const ctx = mediaKitContext();
  ctx.runMutation = async (ref: any, args: any) => getFunctionName(ref) === "facebookPages:consumeState" ? call(consumeState, ctx, args) : call(saveChoices, ctx, args);
  const { url } = await call(startLogin, ctx);
  const state = new URL(url).searchParams.get("state")!;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any) => String(input).includes("/me/permissions") ? Response.json({ data: [{ permission: "read_insights", status: "declined" }] }) : Response.json({ access_token: "USER_PRIVATE" })) as typeof fetch;
  try {
    expect(await call(completeLogin, ctx, { state, code: "CODE", denied: false })).toBe("permission_required");
    expect((await call(getEditor, ctx, { now: Date.now() })).choices).toEqual([]);
  } finally { globalThis.fetch = oldFetch; }
});
test("Facebook callback returns safe feedback to the fixed frontend route", async () => {
  configure();
  const response = await call(oauthCallback, { runAction: async () => "invalid_state" }, new Request("https://backend.test/oauth/facebook/callback?state=x&code=PRIVATE&redirect_uri=https://evil.test"));
  expect(response.headers.get("location")).toBe("https://lumina-app.my/creator/media-kit?facebook=invalid_state");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).not.toContain("PRIVATE");
});
test("revoked Page refresh stores a safe reconnect error", async () => {
  configure();
  const ctx = mediaKitContext();
  const id = await connected(ctx);
  const row = ctx.rows.get(id);
  const args = { connectionId: id, generation: row.generation, refreshId: row.refresh_id };
  ctx.runMutation = (ref: any, params: any) => getFunctionName(ref) === "facebookPages:claimRefresh" ? call(claimRefresh, ctx, params) : call(finishRefresh, ctx, params);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ error: { code: 190, message: "SECRET_RAW_ERROR" } }, { status: 400 })) as typeof fetch;
  try {
    await call(refreshPage, ctx, args);
    expect(ctx.rows.get(id).status).toBe("reconnect_required");
    expect(JSON.stringify(await call(getEditor, ctx, { now: Date.now() }))).not.toContain("SECRET_RAW_ERROR");
  } finally { globalThis.fetch = oldFetch; }
});

test("editor exposes the original Page connection date across refresh and reconnect", async () => {
  const ctx = mediaKitContext();
  const id = await connected(ctx);
  const connectedAt = Date.UTC(2026, 9, 1);
  ctx.rows.get(id)._creationTime = connectedAt;
  expect((await call(getEditor, ctx, { now: Date.now() })).pages[0].connectedAt).toBe(connectedAt);
  await connected(ctx);
  expect((await call(getEditor, ctx, { now: Date.now() })).pages[0].connectedAt).toBe(connectedAt);
});

test("Page visibility is owner-only, defaults visible, and survives reconnect", async () => {
  const { setVisibility } = await import("../convex/facebookPages");
  const ctx = mediaKitContext();
  const id = await connected(ctx);
  expect((await call(getEditor, ctx, { now: Date.now() })).pages[0].isVisible).toBe(true);
  await call(setVisibility, ctx, { connectionId: id, isVisible: false });
  await connected(ctx);
  expect((await call(getEditor, ctx, { now: Date.now() })).pages[0].isVisible).toBe(false);
  ctx.auth.getUserIdentity = async () => ({ subject: "stranger" });
  await expect(call(setVisibility, ctx, { connectionId: id, isVisible: true })).rejects.toThrow();
});

test("Facebook-only media kits publish Page metrics without credentials and respect visibility", async () => {
  const { getPublic, setPublished } = await import("../convex/mediaKits");
  const { setVisibility } = await import("../convex/facebookPages");
  const ctx = mediaKitContext();
  const id = await connected(ctx);
  const kit = [...ctx.rows.values()].find((row: any) => row.table === "media_kits");
  expect(kit).toBeDefined();
  ctx.rows.get(id).snapshot = { fetched_at: 123, since: 1, until: 2, followers: 12, page_likes: 8, media_views: 0, daily_views: [], unavailable: [] };
  await call(setPublished, ctx, { published: true });
  const result = await call(getPublic, ctx, { slug: kit.slug });
  expect(result.accounts).toHaveLength(1);
  expect(result.accounts[0]).toMatchObject({ platform: "facebook", handle: "123", displayName: "My Page", followers: 12, pageLikes: 8, mediaViews: 0 });
  expect(result.totalAudience).toBe(12);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_TOKEN");
  await call(setVisibility, ctx, { connectionId: id, isVisible: false });
  expect((await call(getPublic, ctx, { slug: kit.slug })).accounts).toEqual([]);
  await expect(call(setPublished, ctx, { published: true })).rejects.toThrow();
});

test("existing Facebook-only connections can recover a missing kit", async () => {
  const { ensureKit } = await import("../convex/facebookPages");
  const ctx = mediaKitContext();
  await connected(ctx);
  const original = [...ctx.rows.values()].find((row: any) => row.table === "media_kits");
  ctx.rows.delete(original._id);
  await call(ensureKit, ctx);
  expect([...ctx.rows.values()].filter((row: any) => row.table === "media_kits")).toHaveLength(1);
  await call(ensureKit, ctx);
  expect([...ctx.rows.values()].filter((row: any) => row.table === "media_kits")).toHaveLength(1);
  await expect(call(ensureKit, mediaKitContext(null))).rejects.toThrow();
});

test("Page statistics use complete post samples and lifetime country distribution", async () => {
  configure();
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/posts')) return Response.json({ data: [
      { likes: { summary: { total_count: 2 } }, reactions: { summary: { total_count: 3 } }, comments: { summary: { total_count: 1 } }, shares: { count: 0 } },
      { likes: { summary: { total_count: 4 } }, reactions: { summary: { total_count: 5 } }, comments: { summary: { total_count: 0 } } },
    ] });
    if (url.searchParams.get('metric') === 'page_follows_country') {
      expect(url.searchParams.get('period')).toBe('lifetime');
      expect(url.searchParams.has('since')).toBe(false);
      return Response.json({ data: [{ name: 'page_follows_country', values: [{ value: { MY: 6, US: 4 } }] }] });
    }
    if (url.pathname.endsWith('/insights')) return Response.json({data: []});
    return Response.json({ id: '123', followers_count: 100, fan_count: 90 });
  }) as typeof fetch;
  try {
    const result = await fetchPageInsights('123','PRIVATE_TOKEN');
    expect(result.average_likes).toBe(3);
    expect(result.average_reactions).toBe(4);
    expect(result.engagement_rate).toBe(4.5);
    expect(result.post_sample_size).toBe(2);
    expect(result.audience_country).toEqual([{ country: 'MY', value: 6 }, { country: 'US', value: 4 }]);
  } finally { globalThis.fetch = oldFetch; }
});

test("missing reaction summaries do not become zero averages or engagement", async () => {
  configure();
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/posts')) return Response.json({ data: [{ likes: { summary: { total_count: 0 } } }] });
    if (url.pathname.endsWith('/insights')) return Response.json({ data: [] });
    return Response.json({ id: '123', followers_count: 100 });
  }) as typeof fetch;
  try {
    const result = await fetchPageInsights('123','PRIVATE_TOKEN');
    expect(result.average_likes).toBe(0);
    expect(result.average_reactions).toBeUndefined();
    expect(result.engagement_rate).toBeUndefined();
    expect(result.audience_country).toBeUndefined();
    expect(result.unavailable).toContain('average_reactions');
  } finally { globalThis.fetch = oldFetch; }
});

test("Facebook metric switches hide public values, survive reconnect, and require ownership", async () => {
  const { getPublic, setPublished } = await import("../convex/mediaKits");
  const { setMetricVisibility } = await import("../convex/facebookPages");
  const ctx = mediaKitContext();
  const id = await connected(ctx);
  const kit = [...ctx.rows.values()].find((row: any) => row.table === "media_kits");
  ctx.rows.get(id).snapshot = { fetched_at: 123, since: 1, until: 2, followers: 12, page_likes: 8, engagement_rate: 5, average_likes: 2, average_reactions: 3, audience_country: [{ country: "MY", value: 12 }], daily_views: [], unavailable: [] };
  await call(setPublished, ctx, { published: true });
  const metricVisibility = { followers: false, pageLikes: false, engagementRate: false, averageLikes: false, averageReactions: false, audienceCountry: false };
  await call(setMetricVisibility, ctx, { connectionId: id, metricVisibility });
  const result = await call(getPublic, ctx, { slug: kit.slug });
  for (const key of Object.keys(metricVisibility)) expect(result.accounts[0][key]).toBeUndefined();
  expect(result.totalAudience).toBeUndefined();
  expect((await call(getEditor, ctx, { now: Date.now() })).pages[0].metricVisibility).toEqual(metricVisibility);
  await connected(ctx);
  expect(ctx.rows.get(id).metric_visibility).toEqual(metricVisibility);
  await call(setMetricVisibility, ctx, { connectionId: id, metricVisibility: { followers: true } });
  expect((await call(getPublic, ctx, { slug: kit.slug })).accounts[0].followers).toBe(12);
  ctx.auth.getUserIdentity = async () => ({ subject: "stranger" });
  await expect(call(setMetricVisibility, ctx, { connectionId: id, metricVisibility })).rejects.toThrow();
});

test("multiple selected Facebook Pages connect from one authorized choice list", async () => {
  const ctx = mediaKitContext();
  await call(saveChoices, ctx, { creatorId: "creator-1", pages: [
    { id: "123", name: "First Page", token: "FIRST_PRIVATE_TOKEN" },
    { id: "456", name: "Second Page", token: "SECOND_PRIVATE_TOKEN" },
    { id: "789", name: "Unselected Page", token: "THIRD_PRIVATE_TOKEN" },
  ] });
  for (const pageId of ["123", "456"]) await call(selectPage, ctx, { pageId });
  const editor = await call(getEditor, ctx, { now: Date.now() });
  expect(editor.pages.map((page: any) => page.pageId).sort()).toEqual(["123", "456"]);
  expect(editor.choices.map((page: any) => page.id)).toEqual(["789"]);
  expect(JSON.stringify(editor)).not.toContain("PRIVATE_TOKEN");
});
