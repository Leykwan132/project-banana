import { v } from "convex/values";
export const platform = v.union(v.literal("instagram"), v.literal("tiktok"));
export const instagramProvider = v.union(v.literal("SCRAPING"), v.literal("META_OFFICIAL"));
export const insightWindow = v.object({
  days: v.number(), since: v.number(), until: v.number(), fetched_at: v.number(),
  views: v.optional(v.number()), reach: v.optional(v.number()),
  accounts_engaged: v.optional(v.number()), total_interactions: v.optional(v.number()),
  likes: v.optional(v.number()), comments: v.optional(v.number()),
  shares: v.optional(v.number()), saves: v.optional(v.number()),
  unavailable: v.array(v.string()),
});
export const publicInsightWindow = v.object({
  days: v.number(), since: v.number(), until: v.number(), updatedAt: v.number(),
  visibleMetrics: v.array(v.string()),
  views: v.optional(v.number()), reach: v.optional(v.number()),
  accountsEngaged: v.optional(v.number()), totalInteractions: v.optional(v.number()),
  likes: v.optional(v.number()), comments: v.optional(v.number()),
  shares: v.optional(v.number()), saves: v.optional(v.number()), engagementRate: v.optional(v.number()),
});
export const officialInsights = v.object({
  since: v.number(), until: v.number(), fetched_at: v.number(),
  views: v.optional(v.number()), reach: v.optional(v.number()),
  accounts_engaged: v.optional(v.number()), total_interactions: v.optional(v.number()),
  likes: v.optional(v.number()), comments: v.optional(v.number()),
  shares: v.optional(v.number()), saves: v.optional(v.number()),
  windows: v.optional(v.array(insightWindow)),
  unavailable: v.array(v.string()),
  media: v.array(v.object({ id: v.string(), views: v.optional(v.number()), reach: v.optional(v.number()), shares: v.optional(v.number()), saved: v.optional(v.number()) })),
});
export const metricVisibility = v.object({
  views: v.optional(v.boolean()), reach: v.optional(v.boolean()),
  accountsEngaged: v.optional(v.boolean()), totalInteractions: v.optional(v.boolean()),
  likes: v.optional(v.boolean()), comments: v.optional(v.boolean()),
  shares: v.optional(v.boolean()), saves: v.optional(v.boolean()),
  followers: v.boolean(),
  postCount: v.boolean(),
  engagementRate: v.boolean(),
  averageLikes: v.boolean(),
  averageComments: v.boolean(),
  averageVideoViews: v.boolean(),
  recentPosts: v.boolean(),
});
export const rate = v.object({
  name: v.string(),
  description: v.string(),
  amount_minor: v.number(),
  currency: v.union(v.literal("MYR"), v.literal("USD"), v.literal("SGD")),
  starting_from: v.boolean(),
  is_visible: v.boolean(),
});
export const contact = v.object({
  kind: v.union(
    v.literal("email"),
    v.literal("whatsapp"),
    v.literal("website"),
    v.literal("instagram"),
  ),
  value: v.string(),
  is_visible: v.boolean(),
});
export const partnership = v.object({
  logo_url: v.optional(v.string()),
  brand_name: v.string(),
  description: v.string(),
  url: v.string(),
  is_visible: v.boolean(),
});
export const settingsFields = {
  partnerships: v.optional(v.array(partnership)),
  partnerships_visible: v.optional(v.boolean()),
  slug: v.string(),
  display_name: v.string(),
  bio: v.string(),
  category: v.string(),
  total_audience_visible: v.boolean(),
  rates_visible: v.boolean(),
  contacts_visible: v.boolean(),
  rates: v.array(rate),
  contacts: v.array(contact),
};
export const settings = v.object(settingsFields);
export const postFields = {
  id: v.string(),
  url: v.string(),
  caption: v.string(),
  timestamp: v.optional(v.number()),
  likes: v.optional(v.number()),
  comments: v.optional(v.number()),
  views: v.optional(v.number()),
};
export const post = v.object({
  ...postFields,
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
});
export const snapshot = v.object({
  displayName: v.string(),
  biography: v.string(),
  category: v.string(),
  verified: v.boolean(),
  profileImageUrl: v.optional(v.string()),
  avatarStorageId: v.optional(v.id("_storage")),
  followers: v.optional(v.number()),
  postCount: v.optional(v.number()),
  averageLikes: v.optional(v.number()),
  averageComments: v.optional(v.number()),
  averageVideoViews: v.optional(v.number()),
  engagementRate: v.optional(v.number()),
  engagementSampleSize: v.number(),
  videoSampleSize: v.number(),
  likesSampleSize: v.number(),
  commentsSampleSize: v.number(),
  posts: v.array(post),
});
export const importStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("aborted"),
);
export const kitFields = {
  creator_id: v.id("creators"),
  ...settingsFields,
  photo_storage_id: v.optional(v.id("_storage")),
  primary_account_id: v.optional(v.id("media_kit_accounts")),
  is_published: v.boolean(),
  created_at: v.number(),
  updated_at: v.number(),
};
export const accountFields = {
  platform: v.optional(platform),
  kit_id: v.id("media_kits"),
  handle: v.string(),
  is_visible: v.boolean(),
  metric_visibility: metricVisibility,
  snapshot: v.optional(snapshot),
  official_snapshot: v.optional(snapshot),
  official_success_at: v.optional(v.number()),
  official_refresh_available_at: v.optional(v.number()),
  official_insights: v.optional(officialInsights),
  current_import_id: v.optional(v.id("media_kit_imports")),
  last_success_at: v.optional(v.number()),
  refresh_available_at: v.number(),
  created_at: v.number(),
};
export const importFields = {
  account_id: v.id("media_kit_accounts"),
  generation: v.string(),
  provider: v.optional(instagramProvider),
  connection_generation: v.optional(v.string()),
  status: importStatus,
  apify_run_id: v.optional(v.string()),
  started_at: v.number(),
  finished_at: v.optional(v.number()),
  error_message: v.optional(v.string()),
  poll_failures: v.optional(v.number()),
};
export const kitDoc = v.object({
  _id: v.id("media_kits"),
  _creationTime: v.number(),
  ...kitFields,
});
export const accountDoc = v.object({
  _id: v.id("media_kit_accounts"),
  _creationTime: v.number(),
  ...accountFields,
});
export const importDoc = v.object({
  _id: v.id("media_kit_imports"),
  _creationTime: v.number(),
  ...importFields,
});
export const publicAccount = v.object({
  insightWindows: v.optional(v.array(publicInsightWindow)),
  dataSource: v.optional(instagramProvider),
  platform: v.union(platform, v.literal("facebook")),
  id: v.union(v.id("media_kit_accounts"), v.id("facebook_page_connections")),
  handle: v.string(),
  displayName: v.string(),
  biography: v.string(),
  verified: v.boolean(),
  avatarUrl: v.union(v.string(), v.null()),
  updatedAt: v.number(),
  followers: v.optional(v.number()),
  pageLikes: v.optional(v.number()),
  mediaViews: v.optional(v.number()),
  averageReactions: v.optional(v.number()),
  postSampleSize: v.optional(v.number()),
  audienceCountry: v.optional(v.array(v.object({ country: v.string(), value: v.number() }))),
  postCount: v.optional(v.number()),
  averageLikes: v.optional(v.number()),
  averageComments: v.optional(v.number()),
  averageVideoViews: v.optional(v.number()),
  engagementRate: v.optional(v.number()),
  engagementSampleSize: v.optional(v.number()),
  videoSampleSize: v.optional(v.number()),
  likesSampleSize: v.optional(v.number()),
  commentsSampleSize: v.optional(v.number()),
  posts: v.optional(
    v.array(
      v.object({ ...postFields, imageUrl: v.union(v.string(), v.null()) }),
    ),
  ),
});
export const publicKit = v.object({
  partnerships: v.array(partnership),
  slug: v.string(),
  displayName: v.string(),
  bio: v.string(),
  category: v.string(),
  photoUrl: v.union(v.string(), v.null()),
  totalAudience: v.optional(v.number()),
  accounts: v.array(publicAccount),
  rates: v.array(rate),
  contacts: v.array(
    v.object({ kind: v.string(), label: v.string(), href: v.string() }),
  ),
});
