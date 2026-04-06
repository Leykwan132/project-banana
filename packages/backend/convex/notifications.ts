import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { NotificationType } from "./notificationConstants";
import { emailPool } from "./workpools";

const pushNotifications = new PushNotifications(components.pushNotifications);
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
const notificationDataValidator = v.object({
    type: v.string(),
    submissionId: v.optional(v.id("submissions")),
    applicationId: v.optional(v.id("applications")),
    bankAccountId: v.optional(v.id("bank_accounts")),
    withdrawalId: v.optional(v.id("withdrawals")),
    bankAccountType: v.optional(v.string()),
    endingDigits: v.optional(v.string()),
    missingPostDescription: v.optional(missingPostDescriptionValidator),
});
type NotificationData = {
    type: string;
    submissionId?: Id<"submissions">;
    applicationId?: Id<"applications">;
    bankAccountId?: Id<"bank_accounts">;
    withdrawalId?: Id<"withdrawals">;
    bankAccountType?: string;
    endingDigits?: string;
    missingPostDescription?: {
        instagram?: {
            trackingTagMissing: boolean;
            missingHashtags: string[];
            missingMentions: string[];
            reuploadRequired?: boolean;
            reuploadReason?: string;
        };
        tiktok?: {
            trackingTagMissing: boolean;
            missingHashtags: string[];
            missingMentions: string[];
            reuploadRequired?: boolean;
            reuploadReason?: string;
        };
        checkedAt: number;
    };
};

export const getNotificationUser = internalQuery({
    args: {
        betterAuthUserId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_better_auth_user_id", (q) => q.eq("better_auth_user_id", args.betterAuthUserId))
            .unique();
    },
});

const ensureNotificationUser = async (ctx: any, betterAuthUserId: string) => {
    const existing = await ctx.runQuery(internal.notifications.getNotificationUser, {
        betterAuthUserId,
    });
    if (existing) {
        return existing;
    }

    const userId = await ctx.db.insert("users", {
        better_auth_user_id: betterAuthUserId,
    });

    return await ctx.db.get(userId);
};

const sendPushNotification = async (
    ctx: any,
    args: {
        notificationUserId: Id<"users">;
        title: string;
        description: string;
        data: NotificationData;
        notificationId?: Id<"notifications">;
        redirectType?: string;
        redirectId?: string;
    },
) => {
    const status = await pushNotifications.getStatusForUser(ctx, {
        userId: args.notificationUserId,
    });
    const pushSent = status.hasToken && !status.paused;

    if (!pushSent) {
        return { pushSent };
    }

    const pushData = {
        ...args.data,
        ...(args.notificationId ? { notificationId: args.notificationId } : {}),
        ...(args.redirectType ? { redirect_type: args.redirectType } : {}),
        ...(args.redirectId ? { redirect_id: args.redirectId } : {}),
    };

    await pushNotifications.sendPushNotification(ctx, {
        userId: args.notificationUserId,
        notification: {
            title: args.title,
            body: args.description,
            data: pushData,
        },
    });

    return { pushSent };
};

const getRedirectFields = (data: {
    type: string;
    submissionId?: string;
    applicationId?: string;
    bankAccountId?: string;
    withdrawalId?: string;
}) => {
    switch (data.type) {
        case NotificationType.SubmissionApproved:
        case NotificationType.PostDescriptionMissing:
        case NotificationType.PostEarning:
        case NotificationType.CampaignPausedSubmitSoon:
        case NotificationType.CampaignEndingSoon:
            return {
                redirectType: "application",
                redirectId: data.applicationId,
            };
        case NotificationType.ApplicationUpdatesSummary:
            return {
                redirectType: "notification",
                redirectId: undefined,
            };
        case NotificationType.SubmissionRejected:
            return {
                redirectType: "submission",
                redirectId: data.submissionId,
            };
        case NotificationType.BankAccountApproved:
        case NotificationType.BankAccountRejected:
            return {
                redirectType: "bank-account",
                redirectId: data.bankAccountId,
            };
        case NotificationType.WithdrawalPaid:
            return {
                redirectType: "withdrawal",
                redirectId: data.withdrawalId,
            };
        default:
            return {
                redirectType: "notification",
                redirectId: undefined,
            };
    }
};

const getProductBaseUrl = () => process.env.CONVEX_SITE_URL || process.env.SITE_URL || null;

const buildProductUrl = (path: string) => {
    const baseUrl = getProductBaseUrl();
    if (!baseUrl) {
        return null;
    }

    return new URL(path, baseUrl).toString();
};

// ============================================================
// NOTIFICATION QUERIES
// ============================================================

/**
 * Get all notifications for the current authenticated user
 */
export const getUserNotifications = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            return [];
        }

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            // Implicitly ordered by _creationTime desc because of the index
            .order("desc")
            .collect();

        return notifications;
    },
});

/**
 * Get unread notification count for the current authenticated user
 */
export const getUnreadNotificationCount = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            return 0;
        }

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .filter((q) => q.eq(q.field("is_read"), false))
            .collect();

        return notifications.length;
    },
});

export const getPushNotificationPreference = query({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            return { enabled: false, hasToken: false, paused: false };
        }

        const notificationUser = await ctx.runQuery(internal.notifications.getNotificationUser, {
            betterAuthUserId: user.subject,
        });
        if (!notificationUser) {
            return { enabled: false, hasToken: false, paused: false };
        }

        const status = await pushNotifications.getStatusForUser(ctx, {
            userId: notificationUser._id,
        });

        return {
            enabled: status.hasToken && !status.paused,
            hasToken: status.hasToken,
            paused: status.paused,
        };
    },
});

// ============================================================
// NOTIFICATION MUTATIONS
// ============================================================

/**
 * Create a new notification for a specific user.
 * Can be called from other mutations or internal tools.
 */
export const createNotification = mutation({
    args: {
        userId: v.string(),
        title: v.string(),
        description: v.string(),
        redirectType: v.string(), // e.g. "campaign"
        redirectId: v.optional(v.string()),
        businessId: v.optional(v.id("businesses")),
        data: v.optional(notificationDataValidator),
    },
    handler: async (ctx, args) => {
        const notificationId = await ctx.db.insert("notifications", {
            user_id: args.userId,
            business_id: args.businessId,
            title: args.title,
            description: args.description,
            redirect_type: args.redirectType,
            redirect_id: args.redirectId,
            data: args.data,
            is_read: false,
        });

        return notificationId;
    },
});

/**
 * Mark a specific notification as read.
 */
export const markAsRead = mutation({
    args: {
        notificationId: v.id("notifications"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthenticated");
        }

        const notification = await ctx.db.get(args.notificationId);

        if (!notification) {
            throw new Error("Notification not found");
        }

        if (notification.user_id !== user.subject) {
            throw new Error("Unauthorized access to notification");
        }

        await ctx.db.patch(args.notificationId, {
            is_read: true,
        });

        return true;
    },
});

/**
 * Mark all notifications as read for the current user.
 */
export const markAllAsRead = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthenticated");
        }

        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .filter((q) => q.eq(q.field("is_read"), false))
            .collect();

        for (const notification of unreadNotifications) {
            await ctx.db.patch(notification._id, {
                is_read: true,
            });
        }

        return unreadNotifications.length;
    },
});

export const recordPushNotificationToken = mutation({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthenticated");
        }

        let notificationUser = await ctx.runQuery(internal.notifications.getNotificationUser, {
            betterAuthUserId: user.subject,
        });
        if (!notificationUser) {
            const newUserId = await ctx.db.insert("users", { better_auth_user_id: user.subject });
            notificationUser = await ctx.db.get(newUserId);
            if (!notificationUser) {
                throw new Error("Failed to create notification user");
            }
        }

        await pushNotifications.recordToken(ctx, {
            userId: notificationUser._id,
            pushToken: args.token,
        });
    },
});

export const pausePushNotifications = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthenticated");
        }

        const notificationUser = await ctx.runQuery(internal.notifications.getNotificationUser, {
            betterAuthUserId: user.subject,
        });
        if (!notificationUser) {
            return null;
        }

        await pushNotifications.pauseNotificationsForUser(ctx, {
            userId: notificationUser._id,
        });

        return null;
    },
});

export const unpausePushNotifications = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Unauthenticated");
        }

        const notificationUser = await ctx.runQuery(internal.notifications.getNotificationUser, {
            betterAuthUserId: user.subject,
        });
        if (!notificationUser) {
            return null;
        }

        await pushNotifications.unpauseNotificationsForUser(ctx, {
            userId: notificationUser._id,
        });

        return null;
    },
});


export const getNotificationStatus = query({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const notification = await pushNotifications.getNotification(ctx, args);
        return notification?.state;
    },
});

// ============================================================
// INTERNAL DELIVERY HELPERS
// ============================================================

export const createAndSendNotification = internalMutation({
    args: {
        betterAuthUserId: v.string(),
        title: v.string(),
        description: v.string(),
        data: notificationDataValidator,
    },
    handler: async (ctx, args): Promise<{ notificationId: Id<"notifications">; pushSent: boolean }> => {
        const notificationUser = await ensureNotificationUser(ctx, args.betterAuthUserId);
        if (!notificationUser) {
            throw new Error("Failed to create notification user");
        }

        const { redirectType, redirectId } = getRedirectFields(args.data);

        const notificationId = await ctx.db.insert("notifications", {
            user_id: args.betterAuthUserId,
            title: args.title,
            description: args.description,
            redirect_type: redirectType,
            redirect_id: redirectId,
            data: args.data,
            is_read: false,
        });

        const { pushSent } = await sendPushNotification(ctx, {
            notificationUserId: notificationUser._id,
            title: args.title,
            description: args.description,
            data: args.data,
            notificationId,
            redirectType,
            redirectId,
        });

        return {
            notificationId,
            pushSent,
        };
    },
});

export const sendCreatorChangesSummary = internalMutation({
    args: {
        betterAuthUserId: v.string(),
        title: v.string(),
        description: v.string(),
        data: notificationDataValidator,
    },
    handler: async (ctx, args): Promise<{ pushSent: boolean }> => {
        const notificationUser = await ensureNotificationUser(ctx, args.betterAuthUserId);
        if (!notificationUser) {
            throw new Error("Failed to create notification user");
        }

        return await sendPushNotification(ctx, {
            notificationUserId: notificationUser._id,
            title: args.title,
            description: args.description,
            data: args.data,
        });
    },
});

export const dispatchSubmissionOutcome = internalAction({
    args: {
        userId: v.string(),
        title: v.string(),
        description: v.string(),
        data: notificationDataValidator,
        campaignName: v.string(),
        businessName: v.string(),
        redirectPath: v.string(),
    },
    handler: async (ctx, args): Promise<{ notificationId: Id<"notifications">; pushSent: boolean }> => {
        const authUser = await ctx.runQuery(internal.notifications.getNotificationUser, {
            betterAuthUserId: args.userId,
        });

        const delivery = await ctx.runMutation(internal.notifications.createAndSendNotification, {
            betterAuthUserId: args.userId,
            title: args.title,
            description: args.description,
            data: args.data,
        });

        if (delivery.pushSent || !authUser?.email) {
            return delivery;
        }

        const redirectUrl = buildProductUrl(args.redirectPath) ?? getProductBaseUrl();
        if (!redirectUrl) {
            console.error("Unable to send submission outcome email: product URL is not configured");
            return delivery;
        }

        if (args.data.type === NotificationType.SubmissionApproved) {
            await emailPool.enqueueAction(ctx, internal.emails.sendSubmissionApprovedEmail, {
                email: authUser.email,
                campaignName: args.campaignName,
                businessName: args.businessName,
                redirectUrl,
            }, { retry: false });
            return delivery;
        }

        await emailPool.enqueueAction(ctx, internal.emails.sendSubmissionChangesEmail, {
            email: authUser.email,
            campaignName: args.campaignName,
            businessName: args.businessName,
            redirectUrl,
        }, { retry: false });

        return delivery;
    },
});

export const dispatchCreatorBankAccountOutcome = internalAction({
    args: {
        userId: v.string(),
        title: v.string(),
        description: v.string(),
        data: notificationDataValidator,
        endingDigits: v.string(),
        redirectPath: v.string(),
    },
    handler: async (ctx, args): Promise<{ pushSent: boolean } | null> => {
        const authUser = await ctx.runQuery(internal.notifications.getNotificationUser, {
            betterAuthUserId: args.userId,
        });

        const delivery = await ctx.runMutation(internal.notifications.createAndSendNotification, {
            betterAuthUserId: args.userId,
            title: args.title,
            description: args.description,
            data: args.data,
        });
        const pushSent = delivery.pushSent;

        if (pushSent) {
            return { pushSent };
        }

        const redirectUrl = buildProductUrl(args.redirectPath) ?? getProductBaseUrl();
        if (!redirectUrl) {
            console.error("Unable to send bank account outcome email: product URL is not configured");
            return { pushSent };
        }


        if (!authUser?.email) {
            console.error("Unable to send bank account outcome email: email is not configured");
            return { pushSent };
        }

        if (args.data.type === NotificationType.BankAccountApproved) {
            await emailPool.enqueueAction(ctx, internal.emails.sendBankAccountApprovedEmail, {
                email: authUser.email,
                endingDigits: args.endingDigits,
                redirectUrl,
            }, { retry: false });
            return { pushSent };
        }

        await emailPool.enqueueAction(ctx, internal.emails.sendBankAccountRejectedEmail, {
            email: authUser.email,
            endingDigits: args.endingDigits,
            redirectUrl,
        }, { retry: false });

        return { pushSent };
    },
});

export const dispatchCreatorWithdrawalPaid = internalAction({
    args: {
        userId: v.string(),
        title: v.string(),
        description: v.string(),
        data: notificationDataValidator,
    },
    handler: async (ctx, args): Promise<{ notificationId: Id<"notifications">; pushSent: boolean }> => {
        return await ctx.runMutation(internal.notifications.createAndSendNotification, {
            betterAuthUserId: args.userId,
            title: args.title,
            description: args.description,
            data: args.data,
        });
    },
});

export const dispatchBusinessBankAccountOutcome = internalAction({
    args: {
        userId: v.string(),
        data: notificationDataValidator,
        endingDigits: v.string(),
        redirectPath: v.string(),
    },
    handler: async (ctx, args): Promise<{ pushSent: boolean } | null> => {
        const authUser = await ctx.runQuery(internal.notifications.getNotificationUser, {
            betterAuthUserId: args.userId,
        });
        if (!authUser?.email) {
            return null;
        }

        const redirectUrl = buildProductUrl(args.redirectPath) ?? getProductBaseUrl();
        if (!redirectUrl) {
            console.error("Unable to send bank account outcome email: product URL is not configured");
            return { pushSent: false };
        }

        if (args.data.type === NotificationType.BankAccountApproved) {
            await emailPool.enqueueAction(ctx, internal.emails.sendBankAccountApprovedEmail, {
                email: authUser.email,
                endingDigits: args.endingDigits,
                redirectUrl,
            }, { retry: false });
            return { pushSent: false };
        }

        await emailPool.enqueueAction(ctx, internal.emails.sendBankAccountRejectedEmail, {
            email: authUser.email,
            endingDigits: args.endingDigits,
            redirectUrl,
        }, { retry: false });

        return { pushSent: false };
    },
});

export const dispatchBusinessWithdrawalPaidEmail = internalAction({
    args: {
        userId: v.string(),
        amount: v.string(),
        netAmount: v.string(),
        bankName: v.string(),
        endingDigits: v.string(),
        redirectPath: v.string(),
    },
    handler: async (ctx, args): Promise<{ emailSent: boolean }> => {
        const authUser = await ctx.runQuery(internal.notifications.getNotificationUser, {
            betterAuthUserId: args.userId,
        });

        if (!authUser?.email) {
            return { emailSent: false };
        }

        const redirectUrl = buildProductUrl(args.redirectPath) ?? getProductBaseUrl();
        if (!redirectUrl) {
            console.error("Unable to send withdrawal paid email: product URL is not configured");
            return { emailSent: false };
        }

        await emailPool.enqueueAction(ctx, internal.emails.sendWithdrawalPaidEmail, {
            email: authUser.email,
            amount: args.amount,
            netAmount: args.netAmount,
            bankName: args.bankName,
            endingDigits: args.endingDigits,
            redirectUrl,
        }, { retry: false });

        return { emailSent: true };
    },
});
