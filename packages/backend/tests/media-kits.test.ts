import { expect, test } from "bun:test";
import { mediaKitContext, call } from "./helpers/mediaKitContext";
import {
  addAccount,
  setAccountDisplay,
  saveSettings,
  setPublished,
  getPublic,
  requestRefresh,
  finishImport,
  removeAccount,
  enqueueDaily,
} from "../convex/mediaKits";
import { defaultMetrics, normalizeProfile } from "../convex/lib/mediaKitModel";
import { scrapePool } from "../convex/workpools";
const seed = async () => {
  const ctx = mediaKitContext();
  const old = scrapePool.enqueueAction;
  scrapePool.enqueueAction = async () => "" as any;
  try {
    const id = await call(addAccount, ctx, { handle: "@sample" });
    return {
      ctx,
      id,
      account: ctx.rows.get(id),
      kit: [...ctx.rows.values()].find((r) => r.table === "media_kits"),
    };
  } finally {
    scrapePool.enqueueAction = old;
  }
};
test("unauthenticated and foreign creators cannot edit accounts", async () => {
  await expect(
    call(addAccount, mediaKitContext(null), { handle: "sample" }),
  ).rejects.toThrow();
  const { ctx, id } = await seed();
  ctx.auth.getUserIdentity = async () => ({ subject: "outsider" });
  await expect(
    call(setAccountDisplay, ctx, {
      accountId: id,
      isVisible: false,
      metricVisibility: defaultMetrics,
    }),
  ).rejects.toThrow();
  await expect(call(removeAccount, ctx, { accountId: id })).rejects.toThrow();
});
test("duplicate handle and repeated refresh share the current import; stale completion cannot restore a removed account", async () => {
  const { ctx, id, account } = await seed();
  await expect(call(addAccount, ctx, { handle: "sample" })).rejects.toThrow();
  const job = ctx.rows.get(account.current_import_id);
  expect(await call(requestRefresh, ctx, { accountId: id })).toBe(job._id);
  await call(removeAccount, ctx, { accountId: id });
  expect(
    await call(finishImport, ctx, {
      importId: job._id,
      generation: job.generation,
      snapshot: normalizeProfile(
        { username: "sample", followersCount: 100 },
        "sample",
      ),
    }),
  ).toBe(false);
  expect(ctx.rows.has(id)).toBe(false);
});
test("public queries exclude drafts and independently hidden accounts, metrics, contacts and rates", async () => {
  const { ctx, id, account, kit } = await seed();
  account.snapshot = normalizeProfile(
    {
      username: "sample",
      followersCount: 100,
      latestPosts: [
        { id: "1", shortCode: "a", likesCount: 5, commentsCount: 2 },
      ],
    },
    "sample",
  );
  account.last_success_at = Date.now();
  expect(await call(getPublic, ctx, { slug: kit.slug })).toBeNull();
  await call(saveSettings, ctx, {
    settings: {
      slug: kit.slug,
      display_name: "Owner",
      bio: "",
      category: "Athlete",
      total_audience_visible: true,
      rates_visible: true,
      contacts_visible: true,
      rates: [
        {
          name: "Secret rate",
          description: "",
          amount_minor: 9900,
          currency: "MYR",
          starting_from: false,
          is_visible: false,
        },
      ],
      contacts: [
        { kind: "email", value: "secret@example.com", is_visible: false },
      ],
    },
  });
  await call(setPublished, ctx, { published: true });
  await call(setAccountDisplay, ctx, {
    accountId: id,
    isVisible: true,
    metricVisibility: { ...defaultMetrics, followers: false },
  });
  const visible = await call(getPublic, ctx, { slug: kit.slug });
  expect(visible.totalAudience).toBe(100);
  expect(visible.accounts[0].followers).toBeUndefined();
  expect(visible.rates).toEqual([]);
  expect(visible.contacts).toEqual([]);
  expect(JSON.stringify(visible)).not.toContain("secret");
  await call(setAccountDisplay, ctx, {
    accountId: id,
    isVisible: false,
    metricVisibility: { ...defaultMetrics, followers: false },
  });
  const hidden = await call(getPublic, ctx, { slug: kit.slug });
  expect(hidden.accounts).toEqual([]);
  expect(hidden.totalAudience).toBeUndefined();
});
test("failed refresh preserves previous successful snapshot and daily enqueue skips fresh or deleted-owner accounts", async () => {
  const { ctx, account } = await seed();
  const job = ctx.rows.get(account.current_import_id);
  account.snapshot = normalizeProfile(
    { username: "sample", followersCount: 50 },
    "sample",
  );
  account.last_success_at = Date.now();
  await call(finishImport, ctx, {
    importId: job._id,
    generation: job.generation,
    error: "Service unavailable",
  });
  expect(account.snapshot.followers).toBe(50);
  expect(account.last_success_at).toBeGreaterThan(0);
  expect(ctx.rows.get(job._id).status).toBe("failed");
  expect(await call(enqueueDaily, ctx, { accountId: account._id })).toBeNull();
  account.last_success_at = 0;
  account.refresh_available_at = 0;
  ctx.rows.get("creator-1").is_deleted = true;
  expect(await call(enqueueDaily, ctx, { accountId: account._id })).toBeNull();
});

test("remote leases cap concurrency and stale leases expire", async () => {
  const { claimRun } = await import("../convex/mediaKits");
  const { ctx, id, account } = await seed();
  const job = ctx.rows.get(account.current_import_id);
  for (let i = 0; i < 3; i++)
    await ctx.db.insert("media_kit_imports", {
      account_id: id,
      generation: `other-${i}`,
      status: "running",
      started_at: Date.now(),
    });
  expect(
    await call(claimRun, ctx, {
      importId: job._id,
      generation: job.generation,
    }),
  ).toBe(false);
  for (const row of ctx.rows.values())
    if (row.status === "running") row.started_at = Date.now() - 600001;
  expect(
    await call(claimRun, ctx, {
      importId: job._id,
      generation: job.generation,
    }),
  ).toBe(true);
  expect(
    await call(claimRun, ctx, {
      importId: job._id,
      generation: job.generation,
    }),
  ).toBeNull();
});
test("latest failed import remains visible and refresh preserves creator settings", async () => {
  const { getEditor } = await import("../convex/mediaKits");
  const { ctx, account, kit } = await seed();
  const job = ctx.rows.get(account.current_import_id);
  kit.bio = "Creator authored";
  kit.updated_at = kit.created_at + 1;
  await call(finishImport, ctx, {
    importId: job._id,
    generation: job.generation,
    snapshot: normalizeProfile(
      {
        username: "sample",
        fullName: "Scraped name",
        biography: "Scraped bio",
        followersCount: 30,
      },
      "sample",
    ),
  });
  expect(kit.bio).toBe("Creator authored");
  expect(kit.display_name).toBe("Owner");
  account.refresh_available_at = 0;
  const old = scrapePool.enqueueAction;
  scrapePool.enqueueAction = async () => "" as any;
  try {
    const next = await call(requestRefresh, ctx, { accountId: account._id });
    const j = ctx.rows.get(next);
    await call(finishImport, ctx, {
      importId: next,
      generation: j.generation,
      error: "Private profile",
    });
    const editor = await call(getEditor, ctx);
    expect(editor.accounts[0].job.error_message).toBe("Private profile");
    expect(account.snapshot.followers).toBe(30);
  } finally {
    scrapePool.enqueueAction = old;
  }
});
test("daily refresh includes hidden accounts and drafts, and retains child switches", async () => {
  const { ctx, account } = await seed();
  const job = ctx.rows.get(account.current_import_id);
  await call(finishImport, ctx, {
    importId: job._id,
    generation: job.generation,
    error: "failed",
  });
  account.refresh_available_at = 0;
  await call(setAccountDisplay, ctx, {
    accountId: account._id,
    isVisible: false,
    metricVisibility: { ...defaultMetrics, averageLikes: true },
  });
  const old = scrapePool.enqueueAction;
  scrapePool.enqueueAction = async () => "" as any;
  try {
    expect(
      await call(enqueueDaily, ctx, { accountId: account._id }),
    ).not.toBeNull();
    expect(account.metric_visibility.averageLikes).toBe(true);
  } finally {
    scrapePool.enqueueAction = old;
  }
});
