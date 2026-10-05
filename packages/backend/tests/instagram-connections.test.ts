import { expect, test } from "bun:test";
import { call, mediaKitContext } from "./helpers/mediaKitContext";
import { startLogin, consumeState, saveConnection, disconnect, getConnectionForJob, claimOfficialImport, queueConnected } from "../convex/instagramConnections";
import { hashState } from "../convex/lib/instagramOfficial";

process.env.INSTAGRAM_APP_ID = "test-id";
process.env.INSTAGRAM_APP_SECRET = "test-secret";
process.env.CONVEX_SITE_URL = "https://basic-mule-595.convex.site";
process.env.SITE_URL = "https://lumina-app.my";

test("login requires creator identity and single-use unexpired state", async () => {
  await expect(call(startLogin, mediaKitContext(null))).rejects.toThrow();
  const ctx = mediaKitContext();
  const { url } = await call(startLogin, ctx);
  const state = new URL(url).searchParams.get("state")!;
  const stateHash = await hashState(state);
  expect(await call(consumeState, ctx, { stateHash: "tampered" })).toBeNull();
  expect((await call(consumeState, ctx, { stateHash })).creator_id).toBe("creator-1");
  expect(await call(consumeState, ctx, { stateHash })).toBeNull();
  const second = await call(startLogin, ctx);
  const row = [...ctx.rows.values()].find(r => r.table === "instagram_oauth_states");
  row.expires_at = 0;
  expect(await call(consumeState, ctx, { stateHash: await hashState(new URL(second.url).searchParams.get("state")!) })).toBeNull();
});
test("reconnecting refreshes once even when the previous official snapshot is fresh", async () => {
  const ctx = mediaKitContext();
  const kit = await ctx.db.insert("media_kits", { creator_id: "creator-1" });
  const account = await ctx.db.insert("media_kit_accounts", { kit_id: kit, handle: "sample", platform: "instagram", official_success_at: Date.now(), refresh_available_at: Date.now() + 86400000 });
  await ctx.db.insert("instagram_connections", { creator_id: "creator-1", account_id: account, instagram_user_id: "123", generation: "old", status: "connected" });
  await call(saveConnection, ctx, { creatorId: "creator-1", accountId: account, instagramUserId: "123", handle: "sample", accessToken: "NEW", expiresAt: Date.now() + 100000 });
  await call(queueConnected, ctx, { accountId: account, attempt: 0 });
  const job = [...ctx.rows.values()].find(row => row.table === "media_kit_imports");
  expect(job?.provider).toBe("META_OFFICIAL");
  expect(job?.connection_generation).not.toBe("old");
});
test("connection cannot attach a different Instagram account or another creator's card", async () => {
  const ctx = mediaKitContext();
  const kit = await ctx.db.insert("media_kits", { creator_id: "creator-1" });
  const account = await ctx.db.insert("media_kit_accounts", { kit_id: kit, handle: "sample", platform: "instagram" });
  await expect(call(saveConnection, ctx, { creatorId: "creator-1", accountId: account, instagramUserId: "123", handle: "other", accessToken: "PRIVATE", expiresAt: Date.now() + 100000 })).rejects.toThrow();
  ctx.rows.get(kit).creator_id = "foreign";
  await expect(call(startLogin, ctx, { accountId: account })).rejects.toThrow();
});
test("disconnect invalidates an in-flight official job and removes tokens without deleting scrape data", async () => {
  const ctx = mediaKitContext();
  const kit = await ctx.db.insert("media_kits", { creator_id: "creator-1" });
  const account = await ctx.db.insert("media_kit_accounts", { kit_id: kit, handle: "sample", platform: "instagram", snapshot: { displayName: "Scraped" } });
  const connection = await ctx.db.insert("instagram_connections", { creator_id: "creator-1", account_id: account, instagram_user_id: "123", access_token: "PRIVATE", generation: "current", status: "connected", expires_at: Date.now() + 100000 });
  const job = await ctx.db.insert("media_kit_imports", { account_id: account, provider: "META_OFFICIAL", connection_generation: "current", generation: "job", status: "running" });
  ctx.rows.get(account).current_import_id = job;
  expect(await call(getConnectionForJob, ctx, { importId: job, generation: "job" })).not.toBeNull();
  await call(disconnect, ctx, { accountId: account });
  expect(ctx.rows.has(connection)).toBe(false);
  expect(ctx.rows.get(job).status).toBe("aborted");
  expect(ctx.rows.get(account).snapshot.displayName).toBe("Scraped");
  expect(await call(getConnectionForJob, ctx, { importId: job, generation: "job" })).toBeNull();
});
test("an official job can only be claimed once and a replacement connection invalidates it", async () => {
  const ctx = mediaKitContext();
  const kit = await ctx.db.insert("media_kits", { creator_id: "creator-1" });
  const account = await ctx.db.insert("media_kit_accounts", { kit_id: kit });
  const connection = await ctx.db.insert("instagram_connections", { creator_id: "creator-1", account_id: account, generation: "one", status: "connected" });
  const job = await ctx.db.insert("media_kit_imports", { account_id: account, provider: "META_OFFICIAL", connection_generation: "one", generation: "job", status: "queued" });
  ctx.rows.get(account).current_import_id = job;
  expect(await call(claimOfficialImport, ctx, { importId: job, generation: "job" })).toBe(true);
  expect(await call(claimOfficialImport, ctx, { importId: job, generation: "job" })).toBe(false);
  ctx.rows.get(connection).generation = "two";
  expect(await call(getConnectionForJob, ctx, { importId: job, generation: "job" })).toBeNull();
});
