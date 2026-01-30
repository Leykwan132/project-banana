import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { generateUploadUrl, generateDownloadUrl } from "./s3";
import { api } from "./_generated/api";

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
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const application = await ctx.db.get(args.applicationId);
        if (!application) throw new Error("Application not found");

        const now = Date.now();

        // Create submission
        const submissionId = await ctx.db.insert("submissions", {
            application_id: args.applicationId,
            campaign_id: application.campaign_id,
            video_url: args.video_url, // Might be empty/undefined if s3_key used
            s3_key: args.s3_key,
            status: "reviewing", // Starts in review
            created_at: now,
            updated_at: now,
        });

        // Update application status
        await ctx.db.patch(args.applicationId, {
            status: "reviewing",
            updated_at: now,
        });

        return submissionId;
    },
});

export const reviewSubmission = mutation({
    args: {
        submissionId: v.id("submissions"),
        reviewerId: v.id("users"), // Should be authenticated user in real app
        action: v.string(), // "approved", "rejected", "changes_requested"
        feedback: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to mutation");
        }

        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error("Submission not found");

        const now = Date.now();

        // 1. Update Submission Status
        const newStatus = args.action === "approved" ? "ready_to_post" :
            args.action === "changes_requested" ? "changes_requested" :
                "rejected"; // or just "rejected"

        await ctx.db.patch(args.submissionId, {
            status: newStatus,
            updated_at: now,
        });

        // 2. Create Review Record
        await ctx.db.insert("submission_reviews", {
            submission_id: args.submissionId,
            reviewer_id: args.reviewerId,
            feedback: args.feedback,
            action: args.action,
            reviewed_at: now,
            created_at: now,
        });

        // 3. Update Application if Approved
        if (args.action === "approved") {
            await ctx.db.patch(submission.application_id, {
                status: "ready_to_post",
                approved_submission_id: args.submissionId,
                updated_at: now,
            });
        } else {
            // If changes requested, application status reflects that
            await ctx.db.patch(submission.application_id, {
                status: "changes_requested", // User needs to submit again
                updated_at: now,
            });
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
