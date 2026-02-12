import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { generateUploadUrl, generateDownloadUrl } from "./s3";
import { api } from "./_generated/api";
import { authComponent } from "./auth";

// ============================================================
// QUERIES
// ============================================================

export const getSubmissionsByApplication = query({
    args: { applicationId: v.id("applications") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return []; // Or throw, but for queries usually return empty or null
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
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
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
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return null;
        }
        return await ctx.db.get(args.submissionId);
    }
});

export const getLatestSubmissionFeedback = query({
    args: { submissionId: v.id("submissions") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return null;
        }

        const reviews = await ctx.db
            .query("submission_reviews")
            .withIndex("by_submission", (q) => q.eq("submission_id", args.submissionId))
            .collect();

        if (reviews.length === 0) return null;

        reviews.sort((a, b) => (b.reviewed_at ?? b.created_at) - (a.reviewed_at ?? a.created_at));
        return reviews[0]?.feedback ?? null;
    },
});

// ============================================================
// MUTATIONS
// ============================================================

export const createSubmission = mutation({
    args: {
        applicationId: v.id("applications"),
        video_url: v.optional(v.string()), // Optional now
        s3_key: v.optional(v.string()),    // New
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx);
        if (!user) throw new Error("Unauthenticated call to mutation");

        const application = await ctx.db.get(args.applicationId);
        if (!application) throw new Error("Application not found");

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
            user_id: user._id,
            video_url: args.video_url,
            s3_key: args.s3_key,
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
        const reviewer = await authComponent.getAuthUser(ctx);
        if (!reviewer) throw new Error("Unauthenticated call");

        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error("Submission not found");

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
            reviewer_id: reviewer._id,
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
        const campaign = await ctx.db.get(submission.campaign_id);
        if (campaign && (campaign.pending_approvals ?? 0) > 0) {
            await ctx.db.patch(submission.campaign_id, {
                pending_approvals: (campaign.pending_approvals ?? 1) - 1,
            });

            // Decrement Business Pending Approvals
            const business = await ctx.db.get(campaign.business_id);
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
        const reviewer = await authComponent.getAuthUser(ctx);
        if (!reviewer) throw new Error("Unauthenticated call");

        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error("Submission not found");

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
            reviewer_id: reviewer._id,
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
        const campaign = await ctx.db.get(submission.campaign_id);
        if (campaign && (campaign.pending_approvals ?? 0) > 0) {
            await ctx.db.patch(submission.campaign_id, {
                pending_approvals: (campaign.pending_approvals ?? 1) - 1,
            });

            // Decrement Business Pending Approvals
            const business = await ctx.db.get(campaign.business_id);
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
        const key = crypto.randomUUID();
        const uploadUrl = await generateUploadUrl(key, args.contentType);
        return { uploadUrl, s3Key: key };
    },
});

export const generateVideoAccessUrl = action({
    args: {
        submissionId: v.id("submissions"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }
        const submission = await ctx.runQuery(api.submissions.getSubmission, { submissionId: args.submissionId });
        if (!submission || !submission.s3_key) {
            return null; // Handle missing submission or key
        }

        const url = await generateDownloadUrl(submission.s3_key);
        return url;
    },
});
