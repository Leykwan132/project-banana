import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { ERROR_CODES } from "./errors";
import { generateDownloadUrl, generateUploadUrl } from "./r2";
import {
    ApplicationStatus,
    CAMPAIGN_CATEGORIES,
    CAMPAIGN_CANCELLATION_GRACE_MS,
    CampaignStatus,
    CreditStatus,
    CreditType,
} from "./constants";
import { NotificationCopy, NotificationType } from "./notificationConstants";
import { posthog } from "./posthog";

const getBusinessPlanType = (planType?: string | null) => (planType ?? "payasyougo").toLowerCase();
const isPayAsYouGoPlan = (planType?: string | null) => getBusinessPlanType(planType) === "payasyougo";

type SettlePendingCancellationCampaignArgs = {
    campaign: Doc<"campaigns">;
    business: Doc<"businesses">;
    now: number;
};

const settlePendingCancellationCampaign = async (ctx: any, args: SettlePendingCancellationCampaignArgs) => {
    const refundAmount = Math.max(args.campaign.total_budget - args.campaign.budget_claimed, 0);

    if (refundAmount > 0) {
        await ctx.db.patch(args.business._id, {
            credit_balance: args.business.credit_balance + refundAmount,
            updated_at: args.now,
        });

        await ctx.db.insert("credits", {
            business_id: args.business._id,
            amount: refundAmount,
            status: CreditStatus.Completed,
            type: CreditType.Refund,
            campaign_id: args.campaign._id,
            created_at: args.now,
            reference: `campaign_cancellation_refund:${args.campaign.name}`,
        });
    }

    await ctx.db.patch(args.campaign._id, {
        status: CampaignStatus.Cancelled,
        cancelled_at: args.campaign.cancelled_at ?? args.now,
        updated_at: args.now,
    });
};

const getActiveCampaignLimit = (planType?: string | null) => {
    switch (getBusinessPlanType(planType)) {
        case "growth":
            return 5;
        case "unlimited":
            return null;
        case "starter":
        case "payasyougo":
        default:
            return 1;
    }
};

const sanitizeCampaignValues = (
    values: string[] | undefined,
    label: "hashtags" | "mentions",
    limit: number,
    prefix: "#" | "@",
) => {
    const sanitized = (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean);

    const bareValues = sanitized.map((value) => value.startsWith(prefix) ? value.slice(1).trim() : value);

    const uniqueValues = Array.from(new Set(bareValues.filter(Boolean)));

    if (uniqueValues.length > limit) {
        throw new ConvexError({
            code: ERROR_CODES.INVALID_INPUT.code,
            message: `You can only add up to ${limit} ${label}.`,
        });
    }

    return uniqueValues;
};

const areStringArraysEqual = (left: string[] = [], right: string[] = []) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const assertMentionsAndHashtagsAllowed = (planType?: string | null, hashtags: string[] = [], mentions: string[] = []) => {
    if (!isPayAsYouGoPlan(planType)) {
        return;
    }

    if (hashtags.length === 0 && mentions.length === 0) {
        return;
    }

    throw new ConvexError({
        code: ERROR_CODES.PLAN_RESTRICTED_FEATURE.code,
        message: "Upgrade to Starter, Growth, or Unlimited to unlock hashtags and mentions.",
    });
};

const assertBothPlatformsAllowed = (planType?: string | null, requiresBothPlatformPosts?: boolean) => {
    if (!requiresBothPlatformPosts) {
        return;
    }

    if (isPayAsYouGoPlan(planType)) {
        throw new ConvexError({
            code: ERROR_CODES.PLAN_RESTRICTED_FEATURE.code,
            message: "Upgrade to Starter, Growth, or Unlimited to require both Instagram and TikTok posts.",
        });
    }
};

const allowedCampaignCategoryLabelSet = new Set<string>(CAMPAIGN_CATEGORIES.map((category) => category.label));

const sanitizeCampaignCategories = (categories: string[] = []) => {
    const sanitizedCategories = categories
        .map((category) => category.trim())
        .filter(Boolean);

    if (sanitizedCategories.length === 0) {
        throw new ConvexError({
            code: ERROR_CODES.INVALID_INPUT.code,
            message: "Please select at least one category.",
        });
    }

    const invalidCategories = sanitizedCategories.filter((category) => !allowedCampaignCategoryLabelSet.has(category));

    if (invalidCategories.length > 0) {
        throw new ConvexError({
            code: ERROR_CODES.INVALID_INPUT.code,
            message: `Invalid campaign category: ${invalidCategories.join(", ")}.`,
        });
    }

    return sanitizedCategories;
};

const assertCampaignLimit = async (
    ctx: any,
    businessId: any,
    planType?: string | null,
    excludedCampaignId?: any,
) => {
    const activeCampaignLimit = getActiveCampaignLimit(planType);
    if (activeCampaignLimit == null) {
        return;
    }

    const activeCampaigns = await ctx.db
        .query("campaigns")
        .withIndex("by_business", (q: any) => q.eq("business_id", businessId))
        .filter((q: any) => q.eq(q.field("status"), CampaignStatus.Active))
        .collect();

    const relevantCampaigns = excludedCampaignId
        ? activeCampaigns.filter((campaign: any) => campaign._id !== excludedCampaignId)
        : activeCampaigns;

    if (relevantCampaigns.length >= activeCampaignLimit) {
        throw new ConvexError({
            code: ERROR_CODES.CAMPAIGN_LIMIT_REACHED.code,
            message: "You have reached your active campaign limit. Upgrade your plan or end an active campaign to continue.",
            limit: activeCampaignLimit,
            activeCampaigns: relevantCampaigns.length,
        });
    }
};
// ============================================================
// QUERIES
// ============================================================

export const getCampaign = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;
        const business = await ctx.db.get(campaign.business_id);

        const pendingApprovals = (await ctx.db
            .query("applications")
            .withIndex("by_campaign", (q) => q.eq("campaign_id", args.campaignId))
            .filter((q) => q.eq(q.field("status"), ApplicationStatus.Reviewing))
            .collect()).length;

        return {
            ...campaign,
            logo_url: campaign.logo_url ?? business?.logo_url,
            logo_r2_key: campaign.logo_r2_key ?? business?.logo_r2_key,
            hashtags: campaign.hashtags ?? [],
            mentions: campaign.mentions ?? [],
            requires_both_platform_posts: campaign.requires_both_platform_posts ?? false,
            business_plan_type: business?.subscription_plan_type ?? "payasyougo",
            pendingApprovals,
        };
    },
});

export const getCategorySampleContent = query({
    args: { category: v.string() },
    handler: async (_ctx, args) => {
        const category = CAMPAIGN_CATEGORIES.find((campaignCategory) => campaignCategory.label === args.category);
        if (!category) {
            return null;
        }

        return {
            category: category.label,
            examples: category.examples,
        };
    },
});

export const getCampaignCategories = query({
    args: {},
    handler: async () => CAMPAIGN_CATEGORIES,
});

export const getCampaignsByBusiness = query({
    args: {
        businessId: v.id("businesses"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("campaigns")
            .withIndex("by_business", (q) => q.eq("business_id", args.businessId))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

export const getActiveCampaignCount = query({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_business", (q) => q.eq("business_id", args.businessId))
            .filter((q) => q.eq(q.field("status"), CampaignStatus.Active))
            .collect();
        return campaigns.length;
    },
});

export const getActiveCampaigns = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const result = await ctx.db
            .query("campaigns")
            .withIndex("by_status", (q) => q.eq("status", CampaignStatus.Active))
            .order("desc")
            .paginate(args.paginationOpts);

        const page = await Promise.all(
            result.page.map(async (campaign) => {
                const business = await ctx.db.get(campaign.business_id);
                return {
                    campaignId: campaign._id,
                    name: campaign.name,
                    cover_photo_url: campaign.cover_photo_url,
                    cover_photo_r2_key: campaign.cover_photo_r2_key,
                    logo_url: campaign.logo_url ?? business?.logo_url,
                    logo_r2_key: campaign.logo_r2_key ?? business?.logo_r2_key,
                    payout_threshold: campaign.payout_thresholds[0],
                    base_pay: campaign.base_pay ?? 0,
                    maximum_payout: campaign.maximum_payout,
                    submissions: campaign.submissions,
                    budget_claimed: campaign.budget_claimed,
                    category: campaign.category,
                    business_name: business?.name,
                };
            })
        );

        return {
            isDone: result.isDone,
            continueCursor: result.continueCursor,
            page,
        };
    },
});

// ============================================================
// MUTATIONS
// ============================================================

export const getCampaignsByFilter = query({
    args: {
        businessId: v.id("businesses"),
        status: v.optional(v.string()), // "active", "paused", "completed", "draft", or "all"
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        let q = ctx.db
            .query("campaigns")
            .withIndex("by_business", (q) => q.eq("business_id", args.businessId));

        if (args.status && args.status !== "All") {
            q = q.filter((q) => q.eq(q.field("status"), args.status));
        }

        return await q.order("desc").paginate(args.paginationOpts);
    },
});

export const createCampaign = mutation({
    args: {
        businessId: v.id("businesses"),
        status: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        logo_url: v.optional(v.string()),
        logo_r2_key: v.optional(v.string()),
        cover_photo_url: v.optional(v.string()),
        cover_photo_r2_key: v.optional(v.string()),
        total_budget: v.number(),
        asset_links: v.optional(v.string()),
        base_pay: v.number(),
        maximum_payout: v.number(),
        business_name: v.string(),
        category: v.array(v.string()),
        // Complex objects
        payout_thresholds: v.array(v.object({
            views: v.number(),
            payout: v.number(),
        })),
        requirements: v.array(v.string()),
        scripts: v.optional(v.array(v.object({
            type: v.string(),
            description: v.string(),
        }))),
        hashtags: v.array(v.string()),
        mentions: v.array(v.string()),
        requires_both_platform_posts: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const business = await ctx.db.get(args.businessId);
        if (!business) {
            throw new Error("Business not found");
        }

        const hashtags = sanitizeCampaignValues(args.hashtags, "hashtags", 3, "#");
        const mentions = sanitizeCampaignValues(args.mentions, "mentions", 2, "@");
        const category = sanitizeCampaignCategories(args.category);
        assertMentionsAndHashtagsAllowed(business.subscription_plan_type, hashtags, mentions);
        assertBothPlatformsAllowed(business.subscription_plan_type, args.requires_both_platform_posts);

        const now = Date.now();

        // Only deduct credits if the campaign is active (not draft)
        if (args.status === CampaignStatus.Active) {
            await assertCampaignLimit(ctx, args.businessId, business.subscription_plan_type);

            if (business.credit_balance < args.total_budget) {
                throw new ConvexError({
                    code: ERROR_CODES.INSUFFICIENT_CREDITS.code,
                    message: ERROR_CODES.INSUFFICIENT_CREDITS.message,
                    currentBalance: business.credit_balance,
                    required: args.total_budget
                });
            }
        }

        // Insert campaign first so we have the ID for the credit record
        const campaignId = await ctx.db.insert("campaigns", {
            business_id: args.businessId,
            name: args.name,
            description: args.description,
            logo_url: args.logo_url,
            logo_r2_key: args.logo_r2_key,
            cover_photo_url: args.cover_photo_url,
            cover_photo_r2_key: args.cover_photo_r2_key,
            total_budget: args.total_budget,
            budget_claimed: 0, // Starts at 0
            status: args.status,
            asset_links: args.asset_links,
            base_pay: args.base_pay,
            maximum_payout: args.maximum_payout,
            payout_thresholds: args.payout_thresholds,
            requirements: args.requirements,
            scripts: args.scripts,
            hashtags,
            mentions,
            requires_both_platform_posts: args.requires_both_platform_posts,
            submissions: 0,
            created_at: now,
            updated_at: now,
            business_name: args.business_name,
            category,
        });

        // Deduct credits if active
        if (args.status === CampaignStatus.Active) {
            await ctx.db.patch(business._id, {
                credit_balance: business.credit_balance - args.total_budget,
                updated_at: now,
            });

            await ctx.db.insert("credits", {
                business_id: business._id,
                amount: -args.total_budget,
                status: CreditStatus.Completed,
                type: CreditType.CampaignSpend,
                campaign_id: campaignId,
                created_at: now,
                reference: `campaign_launch:${args.name}`,
            });
        }

        await posthog.capture(ctx, {
            distinctId: args.businessId,
            event: "campaign_created",
            properties: {
                campaignId: campaignId,
                name: args.name,
                total_budget: args.total_budget,
                category,
                base_pay: args.base_pay,
                maximum_payout: args.maximum_payout,
            }
        });

        return campaignId;
    },
});

export const updateCampaignStatus = mutation({
    args: {
        campaignId: v.id("campaigns"),
        status: v.string(), // "paused" | "pending_cancellation" | "completed" | "active"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const allowedStatuses: string[] = [
            CampaignStatus.Active,
            CampaignStatus.Paused,
            CampaignStatus.PendingCancellation,
            CampaignStatus.Completed,
        ];

        if (!allowedStatuses.includes(args.status)) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: "Invalid campaign status update.",
            });
        }

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        if (campaign.status === args.status) {
            return;
        }

        const terminalStatuses: string[] = [
            CampaignStatus.PendingCancellation,
            CampaignStatus.Completed,
            CampaignStatus.Cancelled,
        ];

        if (terminalStatuses.includes(campaign.status)) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: "This campaign can no longer be updated.",
            });
        }

        const business = await ctx.db.get(campaign.business_id);
        if (!business) throw new Error("Business not found");

        if (
            args.status === CampaignStatus.PendingCancellation &&
            campaign.status !== CampaignStatus.Paused
        ) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: "Campaign must be paused before it can be ended.",
            });
        }

        if (
            args.status === CampaignStatus.PendingCancellation &&
            (campaign.pending_approvals ?? 0) > 0
        ) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: "Finish reviewing all pending submissions before ending the campaign.",
            });
        }

        if (args.status === CampaignStatus.Active && campaign.status !== CampaignStatus.Active) {
            await assertCampaignLimit(ctx, campaign.business_id, business.subscription_plan_type, campaign._id);
        }

        // Logic for activating a draft campaign
        if (campaign.status === CampaignStatus.Draft && args.status === CampaignStatus.Active) {
            if (business.credit_balance < campaign.total_budget) {
                throw new ConvexError({
                    code: ERROR_CODES.INSUFFICIENT_CREDITS.code,
                    message: ERROR_CODES.INSUFFICIENT_CREDITS.message,
                    currentBalance: business.credit_balance,
                    required: campaign.total_budget
                });
            }

            const now = Date.now();

            // Deduct credits
            await ctx.db.patch(business._id, {
                credit_balance: business.credit_balance - campaign.total_budget,
                updated_at: now,
            });

            await ctx.db.insert("credits", {
                business_id: business._id,
                amount: -campaign.total_budget,
                status: CreditStatus.Completed,
                type: CreditType.CampaignSpend,
                campaign_id: args.campaignId,
                created_at: now,
                reference: `campaign_launch:${campaign.name}`,
            });
        }

        const now = Date.now();
        await ctx.db.patch(args.campaignId, {
            status: args.status,
            cancelled_at:
                args.status === CampaignStatus.PendingCancellation
                    ? now
                    : undefined,
            updated_at: now,
        });

        if (args.status === CampaignStatus.Paused) {
            const pendingSubmissionApplications = await ctx.db
                .query("applications")
                .withIndex("by_campaign", (q) => q.eq("campaign_id", args.campaignId))
                .filter((q) => q.eq(q.field("status"), ApplicationStatus.PendingSubmission))
                .collect();

            await Promise.all(
                pendingSubmissionApplications.map((application) =>
                    ctx.scheduler.runAfter(0, internal.notifications.createAndSendNotification, {
                        betterAuthUserId: application.user_id,
                        title: NotificationCopy.campaignPausedSubmitSoon.title,
                        description: NotificationCopy.campaignPausedSubmitSoon.description(campaign.name),
                        data: {
                            type: NotificationType.CampaignPausedSubmitSoon,
                            applicationId: application._id,
                        },
                    })
                ),
            );
        }

        if (args.status === CampaignStatus.PendingCancellation) {
            const readyToPostApplications = await ctx.db
                .query("applications")
                .withIndex("by_campaign", (q) => q.eq("campaign_id", args.campaignId))
                .filter((q) => q.eq(q.field("status"), ApplicationStatus.ReadyToPost))
                .collect();

            await Promise.all(
                readyToPostApplications.map((application) =>
                    ctx.scheduler.runAfter(0, internal.notifications.createAndSendNotification, {
                        betterAuthUserId: application.user_id,
                        title: NotificationCopy.campaignEndingSoon.title,
                        description: NotificationCopy.campaignEndingSoon.description(campaign.name),
                        data: {
                            type: NotificationType.CampaignEndingSoon,
                            applicationId: application._id,
                        },
                    })
                ),
            );
        }
    }
});

export const settlePendingCancellationCampaigns = internalMutation({
    args: {},
    handler: async (ctx) => {
        const pendingCancellationCampaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_status", (q) => q.eq("status", CampaignStatus.PendingCancellation))
            .collect();

        const now = Date.now();
        let processed = 0;

        for (const campaign of pendingCancellationCampaigns) {
            if (campaign.cancelled_at == null) {
                continue;
            }

            if ((now - campaign.cancelled_at) < CAMPAIGN_CANCELLATION_GRACE_MS) {
                continue;
            }

            const business = await ctx.db.get(campaign.business_id);
            if (!business) {
                console.warn(`Business ${campaign.business_id} not found for pending-cancellation campaign ${campaign._id}`);
                continue;
            }

            await settlePendingCancellationCampaign(ctx, {
                campaign,
                business,
                now,
            });

            processed += 1;
        }

        return { processed };
    },
});

export const updateCampaign = mutation({
    args: {
        campaignId: v.id("campaigns"),
        name: v.string(),
        description: v.optional(v.string()),
        logo_url: v.optional(v.string()),
        logo_r2_key: v.optional(v.string()),
        use_company_logo: v.optional(v.boolean()),
        cover_photo_url: v.optional(v.string()),
        cover_photo_r2_key: v.optional(v.string()),
        total_budget: v.number(),
        asset_links: v.optional(v.string()),
        base_pay: v.number(),
        maximum_payout: v.number(),
        category: v.array(v.string()),
        payout_thresholds: v.array(v.object({
            views: v.number(),
            payout: v.number(),
        })),
        requirements: v.array(v.string()),
        scripts: v.optional(v.array(v.object({
            type: v.string(),
            description: v.string(),
        }))),
        hashtags: v.optional(v.array(v.string())),
        mentions: v.optional(v.array(v.string())),
        requires_both_platform_posts: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) {
            throw new Error("Campaign not found");
        }

        const business = await ctx.db.get(campaign.business_id);
        if (!business) {
            throw new Error("Business not found");
        }

        const hashtags = campaign.hashtags ?? [];
        const mentions = campaign.mentions ?? [];
        const category = sanitizeCampaignCategories(args.category);
        const requiresBothPlatformPosts = campaign.requires_both_platform_posts ?? false;

        if (args.hashtags !== undefined) {
            const requestedHashtags = sanitizeCampaignValues(args.hashtags, "hashtags", 3, "#");
            if (!areStringArraysEqual(requestedHashtags, hashtags)) {
                throw new ConvexError({
                    code: ERROR_CODES.INVALID_INPUT.code,
                    message: "Hashtags cannot be changed after the campaign is created.",
                });
            }
        }

        if (args.mentions !== undefined) {
            const requestedMentions = sanitizeCampaignValues(args.mentions, "mentions", 2, "@");
            if (!areStringArraysEqual(requestedMentions, mentions)) {
                throw new ConvexError({
                    code: ERROR_CODES.INVALID_INPUT.code,
                    message: "Mentions cannot be changed after the campaign is created.",
                });
            }
        }

        if (args.requires_both_platform_posts !== undefined && args.requires_both_platform_posts !== requiresBothPlatformPosts) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: "Platform posting requirements cannot be changed after the campaign is created.",
            });
        }

        if (args.total_budget < campaign.budget_claimed) {
            throw new ConvexError({
                code: ERROR_CODES.INVALID_INPUT.code,
                message: `Total payouts cannot be lower than claimed amount (RM ${campaign.budget_claimed.toFixed(2)})`,
                claimedAmount: campaign.budget_claimed,
                requestedTotalBudget: args.total_budget,
            });
        }

        // Check if budget is being increased
        if (args.total_budget > campaign.total_budget) {
            const additionalBudget = args.total_budget - campaign.total_budget;

            if (business.credit_balance < additionalBudget) {
                throw new ConvexError({
                    code: ERROR_CODES.INSUFFICIENT_CREDITS.code,
                    message: ERROR_CODES.INSUFFICIENT_CREDITS.message,
                    currentBalance: business.credit_balance,
                    required: additionalBudget
                });
            }

            const now = Date.now();

            // Deduct credits for the budget increase
            await ctx.db.patch(business._id, {
                credit_balance: business.credit_balance - additionalBudget,
                updated_at: now,
            });

            await ctx.db.insert("credits", {
                business_id: business._id,
                amount: -additionalBudget,
                status: "completed",
                type: "campaign_spend",
                campaign_id: args.campaignId,
                created_at: now,
                reference: `campaign_update:${args.name}`,
            });
        }

        // Logic for refunding credits if budget is decreased could go here
        // For now, we only handle increases as requested

        await ctx.db.patch(args.campaignId, {
            name: args.name,
            description: args.description,
            logo_url: args.logo_url,
            logo_r2_key: args.logo_r2_key,
            use_company_logo: args.use_company_logo,
            cover_photo_url: args.cover_photo_url,
            cover_photo_r2_key: args.cover_photo_r2_key,
            total_budget: args.total_budget,
            category,
            asset_links: args.asset_links,
            base_pay: args.base_pay,
            maximum_payout: args.maximum_payout,
            payout_thresholds: args.payout_thresholds,
            requirements: args.requirements,
            scripts: args.scripts,
            hashtags,
            mentions,
            requires_both_platform_posts: requiresBothPlatformPosts,
            updated_at: Date.now(),
        });

        return args.campaignId;
    },
});

export const generateCampaignImageUploadUrl = action({
    args: {
        contentType: v.string(),
        imageType: v.union(v.literal("logo"), v.literal("cover")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }

        const key = crypto.randomUUID();
        const prefix = args.imageType === "logo" ? "campaign-logos" : "campaign-covers";
        const r2Key = `${prefix}/${key}`;
        const uploadUrl = await generateUploadUrl(r2Key, args.contentType);

        return { uploadUrl, r2Key };
    },
});

export const generateCampaignImageAccessUrl = action({
    args: {
        r2Key: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }

        const isAllowedPrefix =
            args.r2Key.startsWith("campaign-logos/") ||
            args.r2Key.startsWith("campaign-covers/") ||
            args.r2Key.startsWith("logos/");

        if (!isAllowedPrefix) {
            throw new Error("Invalid campaign image key");
        }

        return await generateDownloadUrl(args.r2Key);
    },
});
