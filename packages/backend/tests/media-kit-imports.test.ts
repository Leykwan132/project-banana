import { test, expect } from "bun:test";
import { ApifyClient } from "apify-client";
import {
  startImport,
  pollImport,
  refreshDaily,
} from "../convex/mediaKitActions";
import {
  allowedImageUrl,
  cacheInstagramImage,
} from "../convex/lib/mediaKitImages";
import { call } from "./helpers/mediaKitContext";
test("paid start claims a remote concurrency lease and caps charges", async () => {
  const old = ApifyClient.prototype.actor;
  const token = process.env.APIFY_API_TOKEN;
  process.env.APIFY_API_TOKEN = "mock";
  let input: any, options: any;
  const mutations: string[] = [];
  let scheduled = false;
  ApifyClient.prototype.actor = (() => ({
    start: async (i: any, o: any) => {
      input = i;
      options = o;
      return { id: "run" };
    },
  })) as any;
  try {
    await call(
      startImport,
      {
        runQuery: async () => ({ active: true, account: { handle: "sample" } }),
        runMutation: async (ref: any) => {
          mutations.push(String(mutations.length));
          return true;
        },
        scheduler: {
          runAfter: async () => {
            scheduled = true;
          },
        },
      },
      { importId: "job", generation: "one" },
    );
    expect(input).toEqual({ usernames: ["sample"] });
    expect(options.maxTotalChargeUsd).toBe(0.05);
    expect(mutations.length).toBe(2);
    expect(scheduled).toBe(true);
  } finally {
    ApifyClient.prototype.actor = old;
    if (token === undefined) delete process.env.APIFY_API_TOKEN;
    else process.env.APIFY_API_TOKEN = token;
  }
});
test("missing token finishes a running import instead of leaving its lock", async () => {
  const old = process.env.APIFY_API_TOKEN;
  delete process.env.APIFY_API_TOKEN;
  let result: any;
  try {
    await call(
      pollImport,
      {
        runQuery: async () => ({
          active: true,
          job: { started_at: Date.now() },
        }),
        runMutation: async (_ref: any, args: any) => {
          result = args;
          return true;
        },
      },
      { importId: "job", generation: "one", runId: "run", attempt: 0 },
    );
    expect(result.error).toContain("configured");
  } finally {
    if (old !== undefined) process.env.APIFY_API_TOKEN = old;
  }
});
test("daily sweep continues after one failed account and schedules next page", async () => {
  const ids: string[] = [];
  let next: any;
  await call(
    refreshDaily,
    {
      runQuery: async () => ({
        page: [{ _id: "bad" }, { _id: "hidden" }],
        isDone: false,
        continueCursor: "next",
      }),
      runMutation: async (_ref: any, args: any) => {
        ids.push(args.accountId);
        if (args.accountId === "bad") throw Error("mock failure");
      },
      scheduler: {
        runAfter: async (_delay: any, _ref: any, args: any) => {
          next = args;
        },
      },
    },
    {},
  );
  expect(ids).toEqual(["bad", "hidden"]);
  expect(next).toEqual({ cursor: "next" });
});
test("image URLs require trusted HTTPS CDN hosts", () => {
  expect(allowedImageUrl("https://scontent.cdninstagram.com/a.jpg")).toContain(
    "cdninstagram.com",
  );
  for (const url of [
    "http://scontent.cdninstagram.com/a",
    "https://cdninstagram.com.evil.test/a",
    "https://user@fbcdn.net/a",
    "https://fbcdn.net:4433/a",
  ])
    expect(() => allowedImageUrl(url)).toThrow();
});

test("cached images reject unsafe redirects, oversized and non-image responses", async () => {
  const original = globalThis.fetch;
  let stores = 0;
  const ctx: any = {
    storage: {
      store: async () => {
        stores++;
        return "stored";
      },
    },
  };
  try {
    globalThis.fetch = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.test/file" },
      })) as any;
    expect(
      await cacheInstagramImage(ctx, "https://fbcdn.net/avatar"),
    ).toBeUndefined();
    globalThis.fetch = (async () =>
      new Response("x", {
        headers: { "content-type": "image/jpeg", "content-length": "6000000" },
      })) as any;
    expect(
      await cacheInstagramImage(ctx, "https://fbcdn.net/avatar"),
    ).toBeUndefined();
    globalThis.fetch = (async () =>
      new Response("<svg/>", {
        headers: { "content-type": "image/svg+xml" },
      })) as any;
    expect(
      await cacheInstagramImage(ctx, "https://fbcdn.net/avatar"),
    ).toBeUndefined();
    globalThis.fetch = (async () =>
      new Response(new Uint8Array([1, 2]), {
        headers: { "content-type": "image/jpeg" },
      })) as any;
    expect(await cacheInstagramImage(ctx, "https://fbcdn.net/avatar")).toBe(
      "stored",
    );
    expect(stores).toBe(1);
  } finally {
    globalThis.fetch = original;
  }
});

test("busy remote lease postpones a paid start without calling Apify", async () => {
  const old = ApifyClient.prototype.actor;
  let starts = 0,
    scheduled: any;
  ApifyClient.prototype.actor = (() => {
    starts++;
    throw Error("Must not start");
  }) as any;
  try {
    await call(
      startImport,
      {
        runQuery: async () => ({ active: true }),
        runMutation: async () => false,
        scheduler: {
          runAfter: async (_delay: any, _ref: any, args: any) => {
            scheduled = args;
          },
        },
      },
      { importId: "job", generation: "one" },
    );
    expect(starts).toBe(0);
    expect(scheduled.importId).toBe("job");
  } finally {
    ApifyClient.prototype.actor = old;
  }
});
test("successful poll normalizes the expected profile and persists its snapshot", async () => {
  const oldRun = ApifyClient.prototype.run,
    oldDataset = ApifyClient.prototype.dataset,
    token = process.env.APIFY_API_TOKEN;
  process.env.APIFY_API_TOKEN = "mock";
  let saved: any;
  ApifyClient.prototype.run = (() => ({
    get: async () => ({ status: "SUCCEEDED", defaultDatasetId: "data" }),
  })) as any;
  ApifyClient.prototype.dataset = (() => ({
    listItems: async () => ({
      items: [{ username: "sample", followersCount: 100, latestPosts: [] }],
    }),
  })) as any;
  try {
    await call(
      pollImport,
      {
        runQuery: async () => ({
          active: true,
          job: { started_at: Date.now() },
          account: { handle: "sample" },
        }),
        runMutation: async (_ref: any, args: any) => {
          saved = args;
          return true;
        },
        storage: { delete: async () => {} },
      },
      { importId: "job", generation: "one", runId: "run", attempt: 0 },
    );
    expect(saved.snapshot.followers).toBe(100);
    expect(saved.snapshot.posts).toEqual([]);
  } finally {
    ApifyClient.prototype.run = oldRun;
    ApifyClient.prototype.dataset = oldDataset;
    if (token === undefined) delete process.env.APIFY_API_TOKEN;
    else process.env.APIFY_API_TOKEN = token;
  }
});

test("poll scheduling failure aborts the Actor before releasing its lease", async () => {
  const actor = ApifyClient.prototype.actor,
    run = ApifyClient.prototype.run,
    token = process.env.APIFY_API_TOKEN;
  process.env.APIFY_API_TOKEN = "mock";
  let aborted = false;
  const order: string[] = [];
  ApifyClient.prototype.actor = (() => ({
    start: async () => ({ id: "run" }),
  })) as any;
  ApifyClient.prototype.run = (() => ({
    abort: async () => {
      aborted = true;
      order.push("abort");
    },
  })) as any;
  try {
    await call(
      startImport,
      {
        runQuery: async () => ({ active: true, account: { handle: "sample" } }),
        runMutation: async (_ref: any, args: any) => {
          if (args.error) order.push("finish");
          return true;
        },
        scheduler: {
          runAfter: async () => {
            throw Error("mock scheduler failure");
          },
        },
      },
      { importId: "job", generation: "one" },
    );
    expect(aborted).toBe(true);
    expect(order).toEqual(["abort", "finish"]);
  } finally {
    ApifyClient.prototype.actor = actor;
    ApifyClient.prototype.run = run;
    if (token === undefined) delete process.env.APIFY_API_TOKEN;
    else process.env.APIFY_API_TOKEN = token;
  }
});
