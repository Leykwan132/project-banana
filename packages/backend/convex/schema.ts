import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ============================================================
    // BUSINESSES & CAMPAIGNS
    // ============================================================

    businesses: defineTable({
        user_id: v.string(), // Owner
        name: v.string(),
        logo_url: v.optional(v.string()), // Legacy/External URL
        logo_s3_key: v.optional(v.string()), // S3 Key
        industry: v.optional(v.string()),
        size: v.optional(v.string()),
        credit_balance: v.number(),
        pending_approvals: v.optional(v.number()),
        // Stripe subscription fields
        stripe_customer_id: v.optional(v.string()),
        stripe_subscription_id: v.optional(v.string()),
        subscription_status: v.optional(v.string()), // "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused"
        subscription_plan_type: v.optional(v.string()), // "starter" | "growth"
        subscription_billing_cycle: v.optional(v.string()), // "monthly" | "annual"
        subscription_amount: v.optional(v.number()),
        is_onboarded: v.optional(v.boolean()),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_name", ["name"])
        .index("by_user", ["user_id"])
        .index("by_stripe_subscription", ["stripe_subscription_id"])
        .index("by_stripe_customer", ["stripe_customer_id"]),

    campaigns: defineTable({
        business_id: v.id("businesses"),
        name: v.string(),
        logo_url: v.optional(v.string()),
        logo_s3_key: v.optional(v.string()),
        use_company_logo: v.optional(v.boolean()),
        cover_photo_url: v.optional(v.string()),
        cover_photo_s3_key: v.optional(v.string()),
        total_budget: v.number(),
        budget_claimed: v.number(),
        submissions: v.number(),
        status: v.string(), // "draft" | "active" | "paused" | "completed"
        asset_links: v.optional(v.string()),
        maximum_payout: v.number(),
        payout_thresholds: v.array(v.object({
            views: v.number(),
            payout: v.number(),
        })),
        business_name: v.optional(v.string()),
        requirements: v.array(v.string()),
        scripts: v.optional(v.array(v.object({
            type: v.string(),
            description: v.string(),
        }))),
        pending_approvals: v.optional(v.number()),
        category: v.array(v.string()),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_business", ["business_id"])
        .index("by_status", ["status"]),

    user_campaign_status: defineTable({
        user_id: v.string(),
        campaign_id: v.id("campaigns"),
        maximum_payout: v.number(),
        total_earnings: v.number(),
        likes: v.optional(v.number()),
        comments: v.optional(v.number()),
        shares: v.optional(v.number()),
        views: v.optional(v.number()),
        status: v.string(), // "earning" | "maxed_out"
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_status", ["status"])
        .index("by_campaign_earnings", ["campaign_id", "total_earnings"]),

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

    topup_orders: defineTable({
        business_id: v.id("businesses"),
        amount: v.number(), // Amount in display currency (MYR)
        amount_paise: v.number(), // Amount in smallest unit (sen) for Razorpay
        currency: v.string(), // "MYR"
        order_id: v.optional(v.string()), // Order ID returned from Razorpay Create Order API
        // Razorpay specific
        razorpay_payment_id: v.optional(v.string()), // From checkout verification
        razorpay_signature: v.optional(v.string()), // From checkout verification

        // Billplz specific
        provider: v.optional(v.string()), // "razorpay" | "billplz"
        billplz_id: v.optional(v.string()),
        billplz_url: v.optional(v.string()),

        receipt: v.string(), // Internal receipt number
        status: v.string(), // "created" | "paid" | "failed" // For Billplz: "pending" | "paid"
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_business", ["business_id"])
        .index("by_order_id", ["order_id"]) // For Razorpay
        .index("by_billplz_id", ["billplz_id"]) // For Billplz
        .index("by_status", ["status"]),

    // ============================================================
    // user & APPLICATIONS
    // ============================================================

    creators: defineTable({
        user_id: v.string(),
        is_deleted: v.optional(v.boolean()),
        is_onboarded: v.optional(v.boolean()),
        total_views: v.optional(v.number()),
        total_earnings: v.optional(v.number()),
        balance: v.optional(v.number()),
    }).index("by_user", ["user_id"]),

    applications: defineTable({
        user_id: v.string(),
        campaign_id: v.id("campaigns"),
        status: v.string(), // "pending_submission" | "reviewing" | "changes_requested" | "ready_to_post" | "earning"
        ig_post_url: v.optional(v.string()),
        tiktok_post_url: v.optional(v.string()),
        tracking_tag: v.optional(v.string()),
        posted_at: v.optional(v.number()),
        approved_submission_id: v.optional(v.id("submissions")),
        // Cached high-level analytics to avoid recomputing for list rendering
        views: v.optional(v.number()),
        likes: v.optional(v.number()),
        saves: v.optional(v.number()),
        comments: v.optional(v.number()),
        shares: v.optional(v.number()),
        earnings: v.optional(v.number()),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_campaign", ["campaign_id"])
        .index("by_user_campaign", ["user_id", "campaign_id"])
        .index("by_status", ["status"]),

    submissions: defineTable({
        application_id: v.id("applications"),
        user_id: v.string(),
        campaign_id: v.id("campaigns"),
        video_url: v.optional(v.string()),
        s3_key: v.optional(v.string()),
        status: v.string(), // "pending_submission" | "pending_review" | "changes_requested" | "ready_to_post" | "earning"
        created_at: v.number(),
        type: v.string(), // "video" | "image" | "carousel"
        updated_at: v.number(),
        attempt_number: v.number(),
    })
        .index("by_application", ["application_id"])
        .index("by_campaign", ["campaign_id"])
        .index("by_user", ["user_id"])
        .index("by_status", ["status"]),

    submission_reviews: defineTable({
        submission_id: v.id("submissions"),
        reviewer_id: v.string(),
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
        user_id: v.string(),
        application_id: v.optional(v.id("applications")),
        amount: v.number(),
        status: v.string(), // "pending" | "processing" | "completed" | "failed"
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_status", ["status"]),

    withdrawals: defineTable({
        user_id: v.string(),
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

    bank_accounts: defineTable({
        user_id: v.string(),
        bank_name: v.string(),
        account_holder_name: v.optional(v.string()),
        account_number: v.string(),
        status: v.string(), // "pending_review" | "verified" | "rejected"
        proof_document_s3_key: v.optional(v.string()),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_status", ["status"]),

    // ============================================================
    // NOTIFICATIONS
    // ============================================================

    notifications: defineTable({
        user_id: v.string(),
        business_id: v.optional(v.id("businesses")),
        title: v.string(),
        description: v.string(),
        redirect_type: v.string(),
        redirect_id: v.optional(v.string()),
        is_read: v.boolean(),
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
        user_id: v.string(), // Owner of the content
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
