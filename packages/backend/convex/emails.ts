import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// RESEND EMAIL CLIENT
// ============================================================

const resend = new Resend(components.resend, {
    testMode: false,
});

const getResendFromAddress = () => {
    const from = process.env.RESEND_FROM_EMAIL;
    if (!from) {
        console.error("RESEND_FROM_EMAIL must be set");
        return null;
    }

    return from;
};

const sendTemplateEmail = async (
    ctx: Parameters<typeof resend.sendEmail>[0],
    args: {
        email: string;
        templateId: string;
        variables: Record<string, string>;
    },
) => {
    const from = getResendFromAddress();
    if (!from) {
        return;
    }
    console.log('Sending email to', args.email);
    return await resend.sendEmail(ctx, {
        from,
        to: args.email,
        template: {
            id: args.templateId,
            variables: args.variables,
        },
    });
};

// ============================================================
// TRANSACTIONAL EMAIL TEMPLATE IDS (set in Convex environment variables)
// ============================================================

/**
 * Send a welcome email to a newly registered user.
 * Data variables: firstName
 */
export const sendWelcomeEmailBusiness = internalAction({
    args: {
        email: v.string(),
        firstName: v.string(),
    },
    handler: async (ctx, args) => {
        return await sendTemplateEmail(ctx, {
            email: args.email,
            templateId: "welcome-business",
            variables: {
                firstName: args.firstName,
            },
        });
    },
});

/**
 * Send a welcome email to a newly registered user.
 * Data variables: firstName
 */
export const sendWelcomeEmailCreator = internalAction({
    args: {
        email: v.string(),
        firstName: v.string(),
    },
    handler: async (ctx, args) => {
        return await sendTemplateEmail(ctx, {
            email: args.email,
            templateId: "welcome-creators",
            variables: {
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
        endingDigits: v.string(), // Last 4 digits of account number
        redirectUrl: v.string(),
    },
    handler: async (ctx, args) => {
        return await sendTemplateEmail(ctx, {
            email: args.email,
            templateId: "bank-approved",
            variables: {
                endingDigits: args.endingDigits,
                redirectUrl: args.redirectUrl,
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
        endingDigits: v.string(), // Last 4 digits of account number
        redirectUrl: v.string(),
    },
    handler: async (ctx, args) => {
        return await sendTemplateEmail(ctx, {
            email: args.email,
            templateId: "bank-rejected",
            variables: {
                endingDigits: args.endingDigits,
                redirectUrl: args.redirectUrl,
            },
        });
    },
});

/**
 * Send an email to notify the creator that their submission has been approved.
 * Data variables: campaignName, businessName, submissionUrl
 */
export const sendSubmissionApprovedEmail = internalAction({
    args: {
        email: v.string(),
        campaignName: v.string(),
        businessName: v.string(), // Business/brand name
        redirectUrl: v.string(),
    },
    handler: async (ctx, args) => {
        return await sendTemplateEmail(ctx, {
            email: args.email,
            templateId: "submission-approved",
            variables: {
                campaignName: args.campaignName,
                businessName: args.businessName,
                redirectUrl: args.redirectUrl,
            },
        });
    },
});

/**
 * Send an email to notify the creator that their submission has been rejected.
 * Data variables: campaignName, businessName, redirectUrl
 */
export const sendSubmissionChangesEmail = internalAction({
    args: {
        email: v.string(),
        campaignName: v.string(),
        businessName: v.string(), // Business/brand name
        redirectUrl: v.string(),
    },
    handler: async (ctx, args) => {
        return await sendTemplateEmail(ctx, {
            email: args.email,
            templateId: "submission-changes",
            variables: {
                campaignName: args.campaignName,
                businessName: args.businessName,
                redirectUrl: args.redirectUrl,
            },
        });
    },
});

/**
 * Send an earnings update email to a creator.
 * Data variables: amount, campaignName, redirectUrl
 */
export const sendEarningsUpdateEmail = internalAction({
    args: {
        email: v.string(),
        amount: v.string(), // Pre-formatted currency string e.g. "RM 50.00"
        campaignName: v.string(),
        redirectUrl: v.string(), // URL to open the dashboard e.g. "https://your-dashbaord.com"
    },
    handler: async (ctx, args) => {
        return await sendTemplateEmail(ctx, {
            email: args.email,
            templateId: "earning_updates",
            variables: {
                amount: args.amount,
                campaignName: args.campaignName,
                redirectUrl: args.redirectUrl,
            },
        });
    },
});
