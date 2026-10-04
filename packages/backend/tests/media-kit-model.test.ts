import { expect, test } from "bun:test";
import {
  normalizeInstagramHandle,
  normalizeProfile,
  projectAccount,
  validateSettings,
  defaultMetrics,
} from "../convex/lib/mediaKitModel";

test("normalizes profile handles and rejects reel, lookalike-host and malformed URLs", () => {
  for (const input of [
    "@Creator.Name",
    "creator.name",
    "https://www.instagram.com/Creator.Name/?igsh=abc",
  ])
    expect(normalizeInstagramHandle(input)).toBe("creator.name");
  for (const input of [
    "https://instagram.com.evil.test/name",
    "https://instagram.com/reel/abc",
    "https://instagram.com/p/abc",
    "a b",
    "https://evil.test/name",
  ])
    expect(() => normalizeInstagramHandle(input)).toThrow();
});
test("normalizes missing counts without manufacturing zeroes and computes sample-aware engagement", () => {
  const raw = {
    username: "sample",
    fullName: "Sample",
    followersCount: 100,
    latestPosts: [
      { id: "1", shortCode: "a", likesCount: 10, commentsCount: 2 },
      { id: "2", shortCode: "b", likesCount: -1, commentsCount: 3 },
      {
        id: "3",
        shortCode: "c",
        likesCount: 20,
        commentsCount: 4,
        videoViewCount: 200,
        type: "Video",
      },
    ],
  };
  const result = normalizeProfile(raw, "sample");
  expect(result.engagementRate).toBe(18);
  expect(result.engagementSampleSize).toBe(2);
  expect(result.averageLikes).toBe(15);
  expect(result.averageVideoViews).toBe(200);
  expect(result.posts[1].likes).toBeUndefined();
  expect(
    normalizeProfile({ ...raw, followersCount: 0 }, "sample").engagementRate,
  ).toBeUndefined();
  expect(() => normalizeProfile({ ...raw, private: true }, "sample")).toThrow();
  expect(() => normalizeProfile(raw, "other")).toThrow();
});
test("public account projection redacts every disabled metric including post counts independently", () => {
  const snapshot = normalizeProfile(
    {
      username: "sample",
      fullName: "Sample",
      followersCount: 100,
      latestPosts: [
        {
          id: "1",
          shortCode: "a",
          likesCount: 10,
          commentsCount: 2,
          type: "Video",
          videoViewCount: 200,
        },
      ],
    },
    "sample",
  );
  const hidden = projectAccount(snapshot, {
    ...defaultMetrics,
    followers: false,
    averageLikes: false,
    averageComments: false,
    averageVideoViews: false,
    engagementRate: false,
    recentPosts: true,
  });
  expect(hidden.followers).toBeUndefined();
  expect(hidden.engagementRate).toBeUndefined();
  expect(hidden.posts?.[0].likes).toBeUndefined();
  expect(hidden.posts?.[0].comments).toBeUndefined();
  expect(hidden.posts?.[0].views).toBeUndefined();
  const shown = projectAccount(snapshot, {
    ...defaultMetrics,
    followers: true,
    averageLikes: true,
  });
  expect(shown.followers).toBe(100);
  expect(shown.averageLikes).toBe(10);
  expect(
    projectAccount(snapshot, { ...defaultMetrics, recentPosts: false }).posts,
  ).toBeUndefined();
});
test("validates safe contacts, slug and bounded integer money before storing", () => {
  const settings = {
    slug: "sample-kit",
    display_name: "Sample",
    bio: "",
    category: "Athlete",
    total_audience_visible: true,
    rates_visible: true,
    contacts_visible: true,
    rates: [
      {
        name: "Reel",
        description: "",
        amount_minor: 25000,
        currency: "MYR",
        starting_from: false,
        is_visible: true,
      },
    ],
    contacts: [
      { kind: "website", value: "https://example.com", is_visible: true },
    ],
  };
  expect(validateSettings(settings).slug).toBe("sample-kit");
  expect(() => validateSettings({ ...settings, slug: "admin" })).toThrow();
  expect(() =>
    validateSettings({
      ...settings,
      rates: [{ ...settings.rates[0], amount_minor: 1.5 }],
    }),
  ).toThrow();
  expect(() =>
    validateSettings({
      ...settings,
      contacts: [
        { kind: "website", value: "javascript:alert(1)", is_visible: true },
      ],
    }),
  ).toThrow();
  expect(() =>
    validateSettings({
      ...settings,
      contacts: [
        {
          kind: "email",
          value: "x@example.com\nBcc:evil@test.com",
          is_visible: true,
        },
      ],
    }),
  ).toThrow();
});
