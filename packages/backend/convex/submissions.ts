import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { generateUploadUrl, generateDownloadUrl } from "./r2";
import type { Doc, Id } from "./_generated/dataModel";

const getAdminEmails = () => {
    try {
        return JSON.parse(process.env.ADMIN_USER_IDS || "[]") as string[];
    } catch (error) {
        console.error("Failed to parse ADMIN_USER_IDS", error);
        return [];
    }
};

const isAdminIdentity = (identity: { email?: string | null } | null) => {
    return !!identity?.email && getAdminEmails().includes(identity.email);
};

const getSubmissionAccess = async (ctx: any, submissionId: Id<"submissions">) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        return {
            identity: null,
            submission: null,
            campaign: null,
            business: null,
            canAccess: false,
            canReview: false,
        };
    }

    const submission = await ctx.db.get(submissionId);
    if (!submission) {
        return {
            identity,
            submission: null,
            campaign: null,
            business: null,
            canAccess: false,
            canReview: false,
        };
    }

    const campaign = await ctx.db.get(submission.campaign_id);
    const business = campaign ? await ctx.db.get(campaign.business_id) : null;
    const isOwner = submission.user_id === identity.subject;
    const isBusinessOwner = business?.user_id === identity.subject;
    const isAdmin = isAdminIdentity(identity);

    return {
        identity,
        submission,
        campaign,
        business,
        canAccess: isOwner || isBusinessOwner || isAdmin,
        canReview: isBusinessOwner || isAdmin,
    };
};

const canAccessApplicationSubmissions = async (ctx: any, applicationId: Id<"applications">) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const application = await ctx.db.get(applicationId);
    if (!application) return false;
    if (application.user_id === identity.subject || isAdminIdentity(identity)) return true;

    const campaign = await ctx.db.get(application.campaign_id);
    if (!campaign) return false;

    const business = await ctx.db.get(campaign.business_id);
    return business?.user_id === identity.subject;
};

const canReviewCampaignSubmissions = async (ctx: any, campaignId: Id<"campaigns">) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    if (isAdminIdentity(identity)) return true;

    const campaign = await ctx.db.get(campaignId);
    if (!campaign) return false;

    const business = await ctx.db.get(campaign.business_id);
    return business?.user_id === identity.subject;
};

// ============================================================
// QUERIES
// ============================================================

export const getSubmissionsByApplication = query({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        const canAccess = await canAccessApplicationSubmissions(ctx, args.applicationId);
        if (!canAccess) {
            return [];
        }

        return await ctx.db
            .query("submissions")
            .withIndex("by_application", (q) => q.eq("application_id", args.applicationId))
            .order("desc")
            .collect();
    },
});

export const getSubmissionsByCampaignId = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const canReview = await canReviewCampaignSubmissions(ctx, args.campaignId);
        if (!canReview) {
            return [];
        }

        return await ctx.db
            .query("submissions")
            .withIndex("by_campaign", (q) => q.eq("campaign_id", args.campaignId))
            .filter((q) => q.eq(q.field("status"), "pending_review"))
            .order("desc")
            .collect();
    },
});

export const getSubmission = query({
    args: { submissionId: v.id("submissions") },
    handler: async (ctx, args) => {
        const access = await getSubmissionAccess(ctx, args.submissionId);
        if (!access.canAccess) {
            return null;
        }
        return access.submission;
    }
});

export const getLatestSubmissionFeedback = query({
    args: { submissionId: v.id("submissions") },
    handler: async (ctx, args) => {
        const access = await getSubmissionAccess(ctx, args.submissionId);
        if (!access.canAccess || !access.submission) {
            return null;
        }

        const reviews = await ctx.db
            .query("submission_reviews")
            .withIndex("by_submission", (q) => q.eq("submission_id", args.submissionId))
            .collect();

        if (reviews.length === 0) return null;

        reviews.sort((a, b) => (b.reviewed_at ?? b.created_at) - (a.reviewed_at ?? a.created_at));
        const latestReview = reviews[0];

        if (!latestReview || !latestReview.feedback) return null;

        let authorName = "Business";
        let authorLogoUrl = null;
        let authorLogoR2Key = null;

        if (access.campaign) {
            if (access.campaign.business_name) {
                authorName = access.campaign.business_name;
            } else if (access.business) {
                authorName = access.business.name;
            }
            authorLogoUrl = access.campaign.logo_url ?? access.business?.logo_url ?? null;
            authorLogoR2Key = access.campaign.logo_r2_key ?? access.business?.logo_r2_key ?? null;
        }

        return {
            text: latestReview.feedback,
            authorName,
            authorLogoUrl,
            authorLogoR2Key,
            createdAt: latestReview.reviewed_at ?? latestReview.created_at,
        };
    },
});

// ============================================================
// MUTATIONS
// ============================================================

export const createSubmission = mutation({
    args: {
        applicationId: v.id("applications"),
        video_url: v.optional(v.string()), // Optional now
        r2_key: v.optional(v.string()),    // New
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity(); if (!user) throw new Error("Unauthenticated call to mutation");

        const application = await ctx.db.get(args.applicationId);
        if (!application) throw new Error("Application not found");
        if (application.user_id !== user.subject) throw new Error("Unauthorized");

        const now = Date.now();

        // Calculate attempt number
        const existingSubmissions = await ctx.db
            .query("submissions")
            .withIndex("by_application", (q) => q.eq("application_id", args.applicationId))
            .collect();

        const attemptNumber = existingSubmissions.length + 1;

        // TODO: default create video for now
        const submissionId = await ctx.db.insert("submissions", {
            application_id: args.applicationId,
            campaign_id: application.campaign_id,
            user_id: user.subject,
            video_url: args.video_url,
            r2_key: args.r2_key,
            status: "pending_review",
            created_at: now,
            updated_at: now,
            type: "video",
            attempt_number: attemptNumber,
        });

        // Update application status
        await ctx.db.patch(args.applicationId, {
            status: "reviewing",
            updated_at: now,
        });

        // Increment campaign submissions and pending approvals
        const campaign = await ctx.db.get(application.campaign_id);
        if (campaign) {
            await ctx.db.patch(application.campaign_id, {
                submissions: (campaign.submissions || 0) + 1,
                pending_approvals: (campaign.pending_approvals || 0) + 1,
            });

            // Increment business pending approvals
            const business = await ctx.db.get(campaign.business_id);
            if (business) {
                await ctx.db.patch(campaign.business_id, {
                    pending_approvals: (business.pending_approvals || 0) + 1,
                });
            }
        }

        return submissionId;
    },
});

// 2. Approve Submission
export const approveSubmission = mutation({
    args: {
        submissionId: v.id("submissions"),
        feedback: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const access = await getSubmissionAccess(ctx, args.submissionId);
        if (!access.identity) throw new Error("Unauthenticated call");
        if (!access.submission) throw new Error("Submission not found");
        if (!access.canReview) throw new Error("Unauthorized");
        const submission = access.submission;

        // Only process if status is pending_review to avoid double decrement
        if (submission.status !== "pending_review") {
            // Idempotency check: if already approved, maybe just return
            if (submission.status === "ready_to_post") return;
            throw new Error("Submission is not under review");
        }

        const now = Date.now();

        // Update Submission
        await ctx.db.patch(args.submissionId, {
            status: "ready_to_post",
            updated_at: now,
        });

        // Create Review Record
        await ctx.db.insert("submission_reviews", {
            submission_id: args.submissionId,
            reviewer_id: access.identity.subject,
            feedback: args.feedback,
            action: "approved",
            reviewed_at: now,
            created_at: now,
        });

        // Update Application
        await ctx.db.patch(submission.application_id, {
            status: "ready_to_post",
            approved_submission_id: args.submissionId,
            updated_at: now,
        });

        // Decrement Campaign Pending Approvals
        const campaign = await ctx.db.get(submission.campaign_id) as Doc<"campaigns"> | null;
        if (campaign && (campaign.pending_approvals ?? 0) > 0) {
            await ctx.db.patch(submission.campaign_id, {
                pending_approvals: (campaign.pending_approvals ?? 1) - 1,
            });

            // Decrement Business Pending Approvals
            const business = await ctx.db.get(campaign.business_id) as Doc<"businesses"> | null;
            if (business && (business.pending_approvals ?? 0) > 0) {
                await ctx.db.patch(campaign.business_id, {
                    pending_approvals: (business.pending_approvals ?? 1) - 1,
                });
            }
        }
    },
});

// 3. Request Changes
export const requestChanges = mutation({
    args: {
        submissionId: v.id("submissions"),
        feedback: v.string(), // Required for changes request
    },
    handler: async (ctx, args) => {
        const access = await getSubmissionAccess(ctx, args.submissionId);
        if (!access.identity) throw new Error("Unauthenticated call");
        if (!access.submission) throw new Error("Submission not found");
        if (!access.canReview) throw new Error("Unauthorized");
        const submission = access.submission;

        if (submission.status !== "pending_review") {
            if (submission.status === "changes_requested") return;
            throw new Error("Submission is not under review");
        }

        const now = Date.now();

        // Update Submission
        await ctx.db.patch(args.submissionId, {
            status: "changes_requested",
            updated_at: now,
        });

        // Create Review Record
        await ctx.db.insert("submission_reviews", {
            submission_id: args.submissionId,
            reviewer_id: access.identity.subject,
            feedback: args.feedback,
            action: "changes_requested",
            reviewed_at: now,
            created_at: now,
        });

        // Update Application
        await ctx.db.patch(submission.application_id, {
            status: "changes_requested",
            updated_at: now,
        });

        // Decrement Campaign Pending Approvals
        const campaign = await ctx.db.get(submission.campaign_id) as Doc<"campaigns"> | null;
        if (campaign && (campaign.pending_approvals ?? 0) > 0) {
            await ctx.db.patch(submission.campaign_id, {
                pending_approvals: (campaign.pending_approvals ?? 1) - 1,
            });

            // Decrement Business Pending Approvals
            const business = await ctx.db.get(campaign.business_id) as Doc<"businesses"> | null;
            if (business && (business.pending_approvals ?? 0) > 0) {
                await ctx.db.patch(campaign.business_id, {
                    pending_approvals: (business.pending_approvals ?? 1) - 1,
                });
            }
        }
    },
});

// ============================================================
// ACTIONS
// ============================================================

export const generateVideoUploadUrl = action({
    args: {
        contentType: v.string(), // e.g. "video/mp4"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }
        const extension =
            args.contentType === "video/quicktime"
                ? "mov"
                : args.contentType.includes("webm")
                    ? "webm"
                    : "mp4";
        const key = `submission-videos/${identity.subject}/${crypto.randomUUID()}.${extension}`;
        const uploadUrl = await generateUploadUrl(key, args.contentType);
        return { uploadUrl, r2Key: key };
    },
});

export const generateVideoAccessUrl = action({
    args: {
        submissionId: v.id("submissions"),
    },
    handler: async (ctx, args) => {
        const access = await getSubmissionAccess(ctx, args.submissionId);
        if (!access.identity) {
            throw new Error("Unauthenticated call to action");
        }
        if (!access.canAccess || !access.submission || !access.submission.r2_key) {
            return null; // Handle missing submission or key
        }

        const url = await generateDownloadUrl(access.submission.r2_key);
        return url;
    },
});
