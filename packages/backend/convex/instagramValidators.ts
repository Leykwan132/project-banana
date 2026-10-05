import { v } from "convex/values";
export const connectionStatus = v.union(v.literal("connected"), v.literal("reconnect_required"));
export const connectionFields = {
  creator_id: v.id("creators"), account_id: v.id("media_kit_accounts"),
  instagram_user_id: v.string(), access_token: v.string(), expires_at: v.number(),
  refreshed_at: v.number(), generation: v.string(), status: connectionStatus,
};
export const connectionDoc = v.object({ _id: v.id("instagram_connections"), _creationTime: v.number(), ...connectionFields });
export const stateFields = {
  state_hash: v.string(), creator_id: v.id("creators"), account_id: v.optional(v.id("media_kit_accounts")),
  expires_at: v.number(),
};
export const loginIntent = v.object({ creator_id: v.id("creators"), account_id: v.optional(v.id("media_kit_accounts")) });
