import { v } from "convex/values";
export const platform = v.union(v.literal("instagram"), v.literal("tiktok"));
export const metricVisibility = v.object({
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
  current_import_id: v.optional(v.id("media_kit_imports")),
  last_success_at: v.optional(v.number()),
  refresh_available_at: v.number(),
  created_at: v.number(),
};
export const importFields = {
  account_id: v.id("media_kit_accounts"),
  generation: v.string(),
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
  platform,
  id: v.id("media_kit_accounts"),
  handle: v.string(),
  displayName: v.string(),
  biography: v.string(),
  verified: v.boolean(),
  avatarUrl: v.union(v.string(), v.null()),
  updatedAt: v.number(),
  followers: v.optional(v.number()),
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
