import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedData = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const today = new Date().toISOString().split("T")[0] as string;

        // 1. Create User (Owner)
        const userId = await ctx.db.insert("users", {
            name: "Creator Jane",
            profile_pic_url: "https://example.com/jane.jpg",
            total_views: 0,
            total_earnings: 0,
            joined_at: now,
            authId: "user_123", // Dummy token
            created_at: now,
            updated_at: now,
        });

        // 2. Create Business (Linked to User)
        const businessId = await ctx.db.insert("businesses", {
            user_id: userId,
            name: "Acme Corp",
            logo_url: "https://example.com/logo.png",
            size: "1-10",
            credit_balance: 10000,
            created_at: now,
            updated_at: now,
        });

        // 3. Create Campaign
        const campaignId = await ctx.db.insert("campaigns", {
            business_id: businessId,
            name: "Summer Sale Promo",
            cover_photo_url: "https://example.com/cover.png",
            total_budget: 5000,
            budget_claimed: 0,
            submissions: 0,
            status: "active",
            asset_links: "https://example.com/logo.png",
            maximum_payout: 100,
            payout_thresholds: [{ views: 1000, payout: 10 }],
            requirements: ["Must be 30s long"],
            scripts: [{ type: "intro", description: "Hey guys!" }],
            created_at: now,
            updated_at: now,
        });

        // 4. Create Application
        const applicationId = await ctx.db.insert("applications", {
            user_id: userId,
            campaign_id: campaignId,
            status: "earning", // Skip straight to earning for test
            created_at: now,
            updated_at: now,
        });

        // 5. Create Daily Analytics (Manual insert for seed)
        await ctx.db.insert("campaign_analytics_daily", {
            campaign_id: campaignId,
            business_id: businessId,
            date: today,
            views: 1500,
            likes: 300,
            comments: 50,
            shares: 20,
            created_at: now,
            updated_at: now,
        });

        await ctx.db.insert("app_analytics_daily", {
            user_id: userId,
            application_id: applicationId,
            date: today,
            views: 1500,
            likes: 300,
            comments: 50,
            shares: 20,
            created_at: now,
            updated_at: now,
        });

        return "Seeding complete!";
    },
});
