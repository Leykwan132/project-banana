import { Loops } from "@devwithbobby/loops";
import { components } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// LOOPS EMAIL CLIENT
// ============================================================

const loops = new Loops(components.loops);

// ============================================================
// TRANSACTIONAL EMAIL TEMPLATE IDS (set in Convex environment variables)
// ============================================================
// LOOPS_WELCOME_TEMPLATE_ID
// LOOPS_SUBMISSION_APPROVED_TEMPLATE_ID
// LOOPS_SUBMISSION_REJECTED_TEMPLATE_ID
// LOOPS_BANK_APPROVED_TEMPLATE_ID
// LOOPS_BANK_REJECTED_TEMPLATE_ID
// LOOPS_EARNINGS_UPDATE_TEMPLATE_ID

// ============================================================
// CONTACT MANAGEMENT
// ============================================================

/**
 * Add or update a contact in Loops.
 * Called as an action (user-facing, auth-gated).
 */
export const addContact = action({
    args: {
        email: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        return await loops.addContact(ctx, args);
    },
});

/**
 * Add or update a contact in Loops.
 * Called internally (e.g. from mutations/actions during registration).
 */
export const internalAddContact = internalAction({
    args: {
        email: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await loops.addContact(ctx, args);
    },
});

// ============================================================
// TRANSACTIONAL EMAILS
// ============================================================

/**
 * Send a welcome email to a newly registered user.
 * Data variables: firstName
 */
export const sendWelcomeEmail = internalAction({
    args: {
        email: v.string(),
        firstName: v.string(),
    },
    handler: async (ctx, args) => {
        const transactionalId = process.env.LOOPS_WELCOME_TEMPLATE_ID;
        if (!transactionalId) {
            console.error("LOOPS_WELCOME_TEMPLATE_ID is not set");
            return;
        }

        return await loops.sendTransactional(ctx, {
            transactionalId,
            email: args.email,
            dataVariables: {
                firstName: args.firstName,
            },
        });
    },
});

/**
 * Send an email to notify the business that their bank account has been approved.
 * Data variables: firstName, ending (last 4 digits of account number)
 */
export const sendBankAccountApprovedEmail = internalAction({
    args: {
        email: v.string(),
        firstName: v.string(),
        ending: v.string(), // Last 4 digits of account number
        bankUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const transactionalId = process.env.LOOPS_BANK_APPROVED_TEMPLATE_ID;
        if (!transactionalId) {
            console.error("LOOPS_BANK_APPROVED_TEMPLATE_ID is not set");
            return;
        }

        return await loops.sendTransactional(ctx, {
            transactionalId,
            email: args.email,
            dataVariables: {
                firstName: args.firstName,
                ending: args.ending,
                bankUrl: args.bankUrl,
            },
        });
    },
});

/**
 * Send an email to notify the business that their bank account has been rejected.
 * Data variables: firstName, ending (last 4 digits of account number)
 */
export const sendBankAccountRejectedEmail = internalAction({
    args: {
        email: v.string(),
        firstName: v.string(),
        ending: v.string(), // Last 4 digits of account number
        bankUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const transactionalId = process.env.LOOPS_BANK_REJECTED_TEMPLATE_ID;
        if (!transactionalId) {
            console.error("LOOPS_BANK_REJECTED_TEMPLATE_ID is not set");
            return;
        }

        return await loops.sendTransactional(ctx, {
            transactionalId,
            email: args.email,
            dataVariables: {
                firstName: args.firstName,
                ending: args.ending,
                bankUrl: args.bankUrl,
            },
        });
    },
});

/**
 * Send an email to notify the creator that their submission has been approved.
 * Data variables: firstName, campaignName, business, submissionUrl
 */
export const sendSubmissionApprovedEmail = internalAction({
    args: {
        email: v.string(),
        firstName: v.string(),
        campaignName: v.string(),
        business: v.string(), // Business/brand name
        submissionUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const transactionalId = process.env.LOOPS_SUBMISSION_APPROVED_TEMPLATE_ID;
        if (!transactionalId) {
            console.error("LOOPS_SUBMISSION_APPROVED_TEMPLATE_ID is not set");
            return;
        }

        return await loops.sendTransactional(ctx, {
            transactionalId,
            email: args.email,
            dataVariables: {
                firstName: args.firstName,
                campaignName: args.campaignName,
                business: args.business,
                submissionUrl: args.submissionUrl,
            },
        });
    },
});

/**
 * Send an email to notify the creator that their submission has been rejected.
 * Data variables: firstName, campaignName, business, submissionUrl
 */
export const sendSubmissionRejectedEmail = internalAction({
    args: {
        email: v.string(),
        firstName: v.string(),
        campaignName: v.string(),
        business: v.string(), // Business/brand name
        submissionUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const transactionalId = process.env.LOOPS_SUBMISSION_REJECTED_TEMPLATE_ID;
        if (!transactionalId) {
            console.error("LOOPS_SUBMISSION_REJECTED_TEMPLATE_ID is not set");
            return;
        }

        return await loops.sendTransactional(ctx, {
            transactionalId,
            email: args.email,
            dataVariables: {
                firstName: args.firstName,
                campaignName: args.campaignName,
                business: args.business,
                submissionUrl: args.submissionUrl,
            },
        });
    },
});

/**
 * Send an earnings update email to a creator.
 * Data variables: firstName, amount, campaignName, appUrl
 */
export const sendEarningsUpdateEmail = internalAction({
    args: {
        email: v.string(),
        firstName: v.string(),
        amount: v.string(), // Pre-formatted currency string e.g. "RM 50.00"
        campaignName: v.string(),
        appUrl: v.string(), // URL to open the dashboard e.g. "https://your-dashbaord.com"
    },
    handler: async (ctx, args) => {
        const transactionalId = process.env.LOOPS_EARNINGS_UPDATE_TEMPLATE_ID;
        if (!transactionalId) {
            console.error("LOOPS_EARNINGS_UPDATE_TEMPLATE_ID is not set");
            return;
        }

        return await loops.sendTransactional(ctx, {
            transactionalId,
            email: args.email,
            dataVariables: {
                firstName: args.firstName,
                amount: args.amount,
                campaignName: args.campaignName,
                appUrl: args.appUrl,
            },
        });
    },
});
