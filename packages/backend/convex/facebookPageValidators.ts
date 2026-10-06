import { v } from "convex/values";

export const pageMetricVisibility = v.object({
  followers: v.optional(v.boolean()), pageLikes: v.optional(v.boolean()),
  engagementRate: v.optional(v.boolean()), averageLikes: v.optional(v.boolean()),
  averageReactions: v.optional(v.boolean()), audienceCountry: v.optional(v.boolean()),
});
export const pageChoice = v.object({ id: v.string(), name: v.string(), token: v.string() });
export const pageSnapshot = v.object({
  fetched_at: v.number(), since: v.number(), until: v.number(),
  followers: v.optional(v.number()), page_likes: v.optional(v.number()), media_views: v.optional(v.number()),
  average_likes: v.optional(v.number()), average_reactions: v.optional(v.number()), engagement_rate: v.optional(v.number()), post_sample_size: v.optional(v.number()),
  audience_country: v.optional(v.array(v.object({ country: v.string(), value: v.number() }))),
  daily_views: v.array(v.object({ end_time: v.string(), value: v.number() })),
  unavailable: v.array(v.string()),
});
export const pageConnectionFields = {
  creator_id: v.id("creators"), page_id: v.string(), name: v.string(), access_token: v.string(),
  is_visible: v.optional(v.boolean()),
  metric_visibility: v.optional(pageMetricVisibility),
  generation: v.string(), status: v.union(v.literal("connected"), v.literal("reconnect_required")),
  refresh_id: v.optional(v.string()), refresh_status: v.optional(v.union(v.literal("queued"), v.literal("running"))),
  refresh_started_at: v.optional(v.number()), refresh_available_at: v.number(),
  snapshot: v.optional(pageSnapshot), error: v.optional(v.string()),
};
export const pageConnectionDoc = v.object({ _id: v.id("facebook_page_connections"), _creationTime: v.number(), ...pageConnectionFields });
export const refreshArgs = { connectionId: v.id("facebook_page_connections"), generation: v.string(), refreshId: v.string() };
