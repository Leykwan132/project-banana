import { mutation, query } from "./_generated/server";

import { v } from "convex/values";
import { authComponent } from "./auth";

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
            .withIndex("by_user", (q) => q.eq("user_id", String(user._id)))
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
            .withIndex("by_user", (q) => q.eq("user_id", String(user._id)))
            .filter((q) => q.eq(q.field("is_read"), false))
            .collect();

        return notifications.length;
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
        redirectUrl: v.optional(v.string()), // e.g. "/campaigns/123"
        businessId: v.optional(v.id("businesses")),
    },
    handler: async (ctx, args) => {
        const notificationId = await ctx.db.insert("notifications", {
            user_id: args.userId,
            business_id: args.businessId,
            title: args.title,
            description: args.description,
            redirect_url: args.redirectUrl,
            is_read: false,
            created_at: Date.now(),
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
        const user = await authComponent.getAuthUser(ctx);
        if (!user) {
            throw new Error("Unauthenticated");
        }

        const notification = await ctx.db.get(args.notificationId);

        if (!notification) {
            throw new Error("Notification not found");
        }

        if (notification.user_id !== user._id) {
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
        const user = await authComponent.getAuthUser(ctx);
        if (!user) {
            throw new Error("Unauthenticated");
        }

        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("user_id", user._id))
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
