import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components } from "./_generated/api";

const pushNotifications = new PushNotifications(components.pushNotifications);
const getNotificationUser = async (ctx: any, betterAuthUserId: string) => {
    return await ctx.db
        .query("users")
        .withIndex("by_better_auth_user_id", (q: any) => q.eq("better_auth_user_id", betterAuthUserId))
        .unique();
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

        const notificationUser = await getNotificationUser(ctx, user.subject);
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
        userId: v.id("user"),
        title: v.string(),
        description: v.string(),
        redirectType: v.string(), // e.g. "campaign"
        redirectId: v.optional(v.string()),
        businessId: v.optional(v.id("businesses")),
    },
    handler: async (ctx, args) => {
        const notificationId = await ctx.db.insert("notifications", {
            user_id: args.userId,
            business_id: args.businessId,
            title: args.title,
            description: args.description,
            redirect_type: args.redirectType,
            redirect_id: args.redirectId,
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

        let notificationUser = await getNotificationUser(ctx, user.subject);
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

        const notificationUser = await getNotificationUser(ctx, user.subject);
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

        const notificationUser = await getNotificationUser(ctx, user.subject);
        if (!notificationUser) {
            return null;
        }

        await pushNotifications.unpauseNotificationsForUser(ctx, {
            userId: notificationUser._id,
        });

        return null;
    },
});


export const sendPushNotification = mutation({
    args: { title: v.string(), to: v.id("users") },
    handler: async (ctx, args) => {
        // Sending a notification
        return pushNotifications.sendPushNotification(ctx, {
            userId: args.to,
            notification: {
                title: args.title,
            },
        });
    },
});

export const getNotificationStatus = query({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const notification = await pushNotifications.getNotification(ctx, args);
        return notification?.state;
    },
});
