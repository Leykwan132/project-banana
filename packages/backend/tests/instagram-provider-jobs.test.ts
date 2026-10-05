import { expect, test, afterEach } from "bun:test";
import { call, mediaKitContext } from "./helpers/mediaKitContext";
import { enqueueDaily, finishImport, getEditor, getPublic } from "../convex/mediaKits";
import { normalizeProfile } from "../convex/lib/mediaKitModel";
afterEach(() => { delete process.env.INSTAGRAM_DATA_PROVIDER; });
async function seed() {
  const ctx = mediaKitContext();
  const kit = await ctx.db.insert("media_kits", { creator_id: "creator-1", primary_account_id: "account", created_at: 1, updated_at: 2 });
  const account = await ctx.db.insert("media_kit_accounts", { kit_id: kit, handle: "sample", platform: "instagram", refresh_available_at: 0, snapshot: normalizeProfile({ username: "sample", fullName: "Scraped" }, "sample"), last_success_at: Date.now() });
  await ctx.db.insert("instagram_connections", { creator_id: "creator-1", account_id: account, instagram_user_id: "123", generation: "connection", status: "connected", access_token: "PRIVATE", expires_at: Date.now() + 600000 });
  return { ctx, account };
}
test("official mode queues an official job even if scrape data was just updated", async () => {
  process.env.INSTAGRAM_DATA_PROVIDER = "META_OFFICIAL";
  const { ctx, account } = await seed();
  const id = await call(enqueueDaily, ctx, { accountId: account });
  expect(ctx.rows.get(id).provider).toBe("META_OFFICIAL");
  expect(ctx.rows.get(id).connection_generation).toBe("connection");
});
test("official completion preserves scraping snapshot and rejects an obsolete connection", async () => {
  const { ctx, account } = await seed();
  const id = await ctx.db.insert("media_kit_imports", { account_id: account, provider: "META_OFFICIAL", generation: "job", connection_generation: "connection", status: "running" });
  ctx.rows.get(account).current_import_id = id;
  const snapshot = normalizeProfile({ username: "sample", fullName: "Official" }, "sample");
  expect(await call(finishImport, ctx, { importId: id, generation: "job", snapshot })).toBe(true);
  expect(ctx.rows.get(account).snapshot.displayName).toBe("Scraped");
  expect(ctx.rows.get(account).official_snapshot.displayName).toBe("Official");
  const stale = await ctx.db.insert("media_kit_imports", { account_id: account, provider: "META_OFFICIAL", generation: "late", connection_generation: "obsolete", status: "running" });
  ctx.rows.get(account).current_import_id = stale;
  expect(await call(finishImport, ctx, { importId: stale, generation: "late", snapshot })).toBe(false);
});
test("editor uses the selected snapshot and projects connection status without secrets", async () => {
  process.env.INSTAGRAM_DATA_PROVIDER = "META_OFFICIAL";
  const { ctx } = await seed();
  const editor = await call(getEditor, ctx);
  expect(editor.provider).toBe("META_OFFICIAL");
  expect(editor.accounts[0].account.snapshot).toBeUndefined();
  expect(editor.accounts[0].connectionStatus).toBe("connected");
  expect(JSON.stringify(editor)).not.toContain("PRIVATE");
});
test("published official data exposes its source but never private insights or tokens", async () => {
  process.env.INSTAGRAM_DATA_PROVIDER = "META_OFFICIAL";
  const { ctx, account } = await seed();
  const row = ctx.rows.get(account);
  row.is_visible = true;
  row.metric_visibility = { followers: true, postCount: true, engagementRate: true, averageLikes: true, averageComments: true, averageVideoViews: true, recentPosts: true };
  row.official_snapshot = normalizeProfile({ username: "sample", fullName: "Official", followersCount: 100 }, "sample");
  row.official_success_at = 2;
  row.official_insights = { views: 999999, media: [] };
  const kit = ctx.rows.get(row.kit_id);
  Object.assign(kit, { slug: "sample", is_published: true, rates: [], contacts: [] });
  const result = await call(getPublic, ctx, { slug: "sample" });
  expect(result.accounts[0].dataSource).toBe("META_OFFICIAL");
  expect(result.accounts[0].displayName).toBe("Official");
  expect(JSON.stringify(result)).not.toContain("999999");
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
});
test("official cooldown does not overwrite the scraping refresh schedule", async () => {
  const { ctx, account } = await seed();
  ctx.rows.get(account).refresh_available_at = 123;
  const job = await ctx.db.insert("media_kit_imports", { account_id: account, provider: "META_OFFICIAL", generation: "job", connection_generation: "connection", status: "running" });
  ctx.rows.get(account).current_import_id = job;
  await call(finishImport, ctx, { importId: job, generation: "job", snapshot: normalizeProfile({ username: "sample" }, "sample") });
  expect(ctx.rows.get(account).refresh_available_at).toBe(123);
  expect(ctx.rows.get(account).official_refresh_available_at).toBeGreaterThan(Date.now());
});
