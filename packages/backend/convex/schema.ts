import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const platformMissingDescriptionValidator = v.object({
    trackingTagMissing: v.boolean(),
    missingHashtags: v.array(v.string()),
    missingMentions: v.array(v.string()),
    reuploadRequired: v.optional(v.boolean()),
    reuploadReason: v.optional(v.string()),
});

const missingPostDescriptionValidator = v.object({
    instagram: v.optional(platformMissingDescriptionValidator),
    tiktok: v.optional(platformMissingDescriptionValidator),
    checkedAt: v.number(),
});

export default defineSchema({
    // ============================================================
    // NOTIFICATION USERS
    // ============================================================

    users: defineTable({
        // Mirrors the Better Auth `user` document _id strictly for notification routing.
        better_auth_user_id: v.string(),
        email: v.optional(v.string()),
        email_verified: v.optional(v.boolean()),
        image: v.optional(v.string()),
        is_anonymous: v.optional(v.boolean()),
        name: v.optional(v.string()),
        phone_number: v.optional(v.string()),
        phone_number_verified: v.optional(v.boolean()),
        two_factor_enabled: v.optional(v.boolean()),
        username: v.optional(v.string()),
        display_username: v.optional(v.string()),
        created_at: v.optional(v.number()),
        updated_at: v.optional(v.number()),
    }).index("by_better_auth_user_id", ["better_auth_user_id"]),

    // ============================================================
    // BUSINESSES & CAMPAIGNS
    // ============================================================

    businesses: defineTable({
        user_id: v.string(), // Owner
        name: v.string(),
        logo_url: v.optional(v.string()), // Legacy/External URL
        logo_r2_key: v.optional(v.string()), // R2 Key
        industry: v.optional(v.string()),
        size: v.optional(v.string()),
        credit_balance: v.number(),
        pending_approvals: v.optional(v.number()),
        // High-level aggregate stats (updated by cron)
        total_views: v.optional(v.number()),
        total_likes: v.optional(v.number()),
        total_comments: v.optional(v.number()),
        total_shares: v.optional(v.number()),
        // Stripe subscription fields
        stripe_customer_id: v.optional(v.string()),
        stripe_subscription_id: v.optional(v.string()),
        subscription_status: v.optional(v.string()), // "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused"
        subscription_plan_type: v.optional(v.string()), // "starter" | "growth"
        subscription_billing_cycle: v.optional(v.string()), // "monthly" | "annual"
        subscription_amount: v.optional(v.number()),
        is_onboarded: v.optional(v.boolean()),
        updated_at: v.number(),
        created_at: v.number(),
    })
        .index("by_name", ["name"])
        .index("by_user", ["user_id"])
        .index("by_stripe_subscription", ["stripe_subscription_id"])
        .index("by_stripe_customer", ["stripe_customer_id"]),

    campaigns: defineTable({
        business_id: v.id("businesses"),
        name: v.string(),
        logo_url: v.optional(v.string()),
        logo_r2_key: v.optional(v.string()),
        use_company_logo: v.optional(v.boolean()),
        cover_photo_url: v.optional(v.string()),
        cover_photo_r2_key: v.optional(v.string()),
        total_budget: v.number(),
        budget_claimed: v.number(),
        submissions: v.number(),
        status: v.string(), // "draft" | "active" | "paused" | "completed"
        asset_links: v.optional(v.string()),
        base_pay: v.optional(v.number()),
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
        hashtags: v.optional(v.array(v.string())),
        mentions: v.optional(v.array(v.string())),
        requires_both_platform_posts: v.optional(v.boolean()),
        pending_approvals: v.optional(v.number()),
        category: v.array(v.string()),
        cancelled_at: v.optional(v.number()),
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
        campaign_id: v.optional(v.id("campaigns")),
        reference: v.optional(v.string()),
        created_at: v.number(),
    })
        .index("by_business", ["business_id"])
        .index("by_status", ["status"])
        .index("by_business_type", ["business_id", "type"]),

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
        name: v.string(),
        username: v.optional(v.string()),
        signup_goal: v.optional(v.array(v.string())),
        referral_source: v.optional(v.string()),
        is_deleted: v.optional(v.boolean()),
        is_test_user: v.optional(v.boolean()),
        total_views: v.optional(v.number()),
        total_earnings: v.optional(v.number()),
        balance: v.optional(v.number()),
    }).index("by_user", ["user_id"])
        .index("by_username", ["username"]),

    applications: defineTable({
        user_id: v.string(),
        campaign_id: v.id("campaigns"),
        status: v.string(), // "pending_submission" | "reviewing" | "changes_requested" | "ready_to_post" | "verifying" | "action_required" | "earning"
        ig_post_url: v.optional(v.string()),
        tiktok_post_url: v.optional(v.string()),
        tracking_tag: v.optional(v.string()),
        posted_at: v.optional(v.number()),
        approved_submission_id: v.optional(v.id("submissions")),
        missing_post_description: v.optional(missingPostDescriptionValidator),
        // Cached high-level analytics to avoid recomputing for list rendering
        views: v.optional(v.number()),
        likes: v.optional(v.number()),
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
        r2_key: v.optional(v.string()),
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
        business_id: v.optional(v.id("businesses")),
        bank_account_id: v.id("bank_accounts"), // optional for backwards compat with legacy records
        amount: v.number(),
        gateway_fee: v.number(), // Recorded at the time of withdrawal
        source_type: v.optional(v.string()), // "creator" | "business"
        status: v.string(), // "pending" | "processing" | "completed" | "failed"
        billplz_payment_order_id: v.optional(v.string()),
        created_at: v.number(),
    })
        .index("by_user", ["user_id"])
        .index("by_status", ["status"])
        .index("by_billplz_payment_order", ["billplz_payment_order_id"]),

    bank_accounts: defineTable({
        user_id: v.string(),
        bank_name: v.string(),
        bank_code: v.optional(v.string()), // SWIFT bank code (e.g. "MBBEMYKL")
        account_holder_name: v.string(),
        account_number: v.string(),
        source_type: v.optional(v.string()), // "creator" | "business"
        status: v.string(), // "pending_review" | "verified" | "rejected"
        proof_document_r2_key: v.optional(v.string()),
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
        data: v.optional(v.object({
            type: v.string(),
            submissionId: v.optional(v.id("submissions")),
            applicationId: v.optional(v.id("applications")),
            bankAccountId: v.optional(v.id("bank_accounts")),
            bankAccountType: v.optional(v.string()),
            endingDigits: v.optional(v.string()),
            missingPostDescription: v.optional(missingPostDescriptionValidator),
        })),
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
        earnings: v.number(),
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
        amount_spent: v.number(),
        created_at: v.number(),
        updated_at: v.number(),
    }).index("by_business_date", ["business_id", "date"]),

    app_analytics_daily: defineTable({
        business_id: v.optional(v.id("businesses")),
        user_id: v.string(), // Owner of the content
        application_id: v.id("applications"),
        campaign_id: v.id("campaigns"),
        date: v.string(), // "YYYY-MM-DD" format
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        earnings: v.number(),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index("by_business_date", ["business_id", "date"])
        .index("by_user_date", ["user_id", "date"])
        .index("by_application_date", ["application_id", "date"]),

    creator_analytics_daily: defineTable({
        user_id: v.string(),
        date: v.string(), // "YYYY-MM-DD" format
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        earnings: v.number(),
        created_at: v.number(),
        updated_at: v.number(),
    }).index("by_user_date", ["user_id", "date"]),
});
