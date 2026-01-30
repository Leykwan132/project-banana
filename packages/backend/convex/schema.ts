import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ============================================================
    // BUSINESSES & CAMPAIGNS
    // ============================================================

    businesses: defineTable({
        user_id: v.id("users"), // Owner
        name: v.string(),
        logo_url: v.optional(v.string()), // Legacy/External URL
        logo_s3_key: v.optional(v.string()), // S3 Key
        industry: v.optional(v.string()),
        size: v.optional(v.string()),
        credit_balance: v.number(),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_name", ["name"])
        .index("by_user", ["user_id"]),

    campaigns: defineTable({
        business_id: v.id("businesses"),
        name: v.string(),
        cover_photo_url: v.optional(v.string()),
        total_budget: v.number(),
        budget_claimed: v.number(),
        status: v.string(), // "draft" | "active" | "paused" | "completed"
        asset_links: v.optional(v.string()),
        maximum_payout: v.number(),
        payout_thresholds: v.array(v.object({
            views: v.number(),
            payout: v.number(),
        })),
        requirements: v.array(v.object({
            description: v.string(),
        })),
        scripts: v.optional(v.array(v.object({
            type: v.string(),
            description: v.string(),
        }))),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_business", ["business_id"])
        .index("by_status", ["status"]),

    credits: defineTable({
        business_id: v.id("businesses"),
        amount: v.number(),
        status: v.string(), // "pending" | "completed" | "failed"
        type: v.string(), // "top_up" | "campaign_spend" | "refund"
        reference: v.optional(v.string()),
        created_at: v.number(),
    })
        .index("by_business", ["business_id"])
        .index("by_status", ["status"]),

    // ============================================================
    // USERS & APPLICATIONS
    // ============================================================

    users: defineTable({
        isDeleted: v.optional(v.boolean()), // Soft delete
        profile_pic_url: v.optional(v.string()), // New
        total_views: v.optional(v.number()),
        total_earnings: v.optional(v.number()),
        joined_at: v.optional(v.number()),
        bank_account: v.optional(v.string()),
        bank_name: v.optional(v.string()), // Restored
        created_at: v.optional(v.number()), // Restored
        updated_at: v.optional(v.number()), // Restored
        // AuthKit fields
        authId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()), // Added back since user might need it, or user removed it?
    })
        .index("by_authId", ["authId"]),

    applications: defineTable({
        user_id: v.id("users"),
        campaign_id: v.id("campaigns"),
        status: v.string(), // "pending_submission" | "reviewing" | "changes_requested" | "ready_to_post" | "earning"
        ig_post_url: v.optional(v.string()),
        tiktok_post_url: v.optional(v.string()),
        tracking_tag: v.optional(v.string()),
        posted_at: v.optional(v.number()),
        approved_submission_id: v.optional(v.id("submissions")),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_campaign", ["campaign_id"])
        .index("by_user_campaign", ["user_id", "campaign_id"])
        .index("by_status", ["status"]),

    submissions: defineTable({
        application_id: v.id("applications"),
        campaign_id: v.id("campaigns"),
        video_url: v.optional(v.string()),
        s3_key: v.optional(v.string()),
        status: v.string(), // "pending_submission" | "reviewing" | "changes_requested" | "ready_to_post" | "earning"
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_application", ["application_id"])
        .index("by_campaign", ["campaign_id"])
        .index("by_status", ["status"]),

    submission_reviews: defineTable({
        submission_id: v.id("submissions"),
        reviewer_id: v.id("users"),
        feedback: v.optional(v.string()),
        action: v.string(), // "approved" | "changes_requested"
        reviewed_at: v.number(),
        created_at: v.number(),
    })
        .index("by_submission", ["submission_id"])
        .index("by_reviewer", ["reviewer_id"]),

    // ============================================================
    // FINANCIALS
    // ============================================================

    payouts: defineTable({
        user_id: v.id("users"),
        application_id: v.optional(v.id("applications")),
        amount: v.number(),
        status: v.string(), // "pending" | "processing" | "completed" | "failed"
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_status", ["status"]),

    withdrawals: defineTable({
        user_id: v.id("users"),
        amount: v.number(),
        status: v.string(), // "pending" | "processing" | "completed" | "failed"
        bank_account: v.string(),
        bank_name: v.string(),
        requested_at: v.number(),
        processed_at: v.optional(v.number()),
        created_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_status", ["status"]),

    // ============================================================
    // NOTIFICATIONS
    // ============================================================

    notifications: defineTable({
        user_id: v.optional(v.id("users")),
        business_id: v.optional(v.id("businesses")),
        title: v.string(),
        description: v.string(),
        redirect_url: v.optional(v.string()),
        is_read: v.boolean(),
        created_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_business", ["business_id"])
        .index("by_is_read", ["is_read"]),

    // ============================================================
    // ANALYTICS
    // ============================================================

    campaign_analytics_daily: defineTable({
        campaign_id: v.id("campaigns"),
        business_id: v.id("businesses"),
        date: v.string(), // "YYYY-MM-DD" format
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_campaign_date", ["campaign_id", "date"])
        .index("by_business_date", ["business_id", "date"]),

    business_analytics_daily: defineTable({
        business_id: v.id("businesses"),
        date: v.string(), // "YYYY-MM-DD" format
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        created_at: v.number(),
        updated_at: v.number(),
    }).index("by_business_date", ["business_id", "date"]),

    app_analytics_daily: defineTable({
        user_id: v.id("users"), // Owner of the content
        application_id: v.id("applications"),
        date: v.string(), // "YYYY-MM-DD" format
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_user_date", ["user_id", "date"])
        .index("by_application_date", ["application_id", "date"]),
});