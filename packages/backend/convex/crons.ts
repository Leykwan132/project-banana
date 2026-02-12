import { cronJobs } from "convex/server";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

/**
 * Calculate earning based on cumulative threshold logic.
 * Each threshold can be counted multiple times based on views.
 * Processes thresholds from largest to smallest (greedy algorithm).
 */
function calculateEarning(
    views: number,
    thresholds: Array<{ views: number; payout: number }>,
    maximumPayout: number
): number {
    // Sort thresholds by views descending (greedy: use largest first)
    const sorted = [...thresholds].sort((a, b) => b.views - a.views);

    let remainingViews = views;
    let totalEarning = 0;

    for (const threshold of sorted) {
        if (remainingViews >= threshold.views) {
            // How many times does this threshold fit?
            const count = Math.floor(remainingViews / threshold.views);
            totalEarning += count * threshold.payout;
            remainingViews -= count * threshold.views;
        }
    }

    // Cap at maximum payout
    return Math.min(totalEarning, maximumPayout);
}

const crons = cronJobs();

export const runDailyScrape = internalAction({
    args: {},
    handler: async (ctx) => {
        const internalAny = internal as any;

        let cursor: string | undefined = undefined;
        let isDone = false;

        // Process applications in batches using pagination
        while (!isDone) {
            const result: {
                page: Array<{
                    _id: any;
                    campaign_id: any;
                    campaignStatusId: any;
                    userCampaignMaxPayout: number;
                    ig_post_url?: string;
                    tiktok_post_url?: string;
                    tracking_tag?: string;
                }>;
                continueCursor: string;
                isDone: boolean;
            } = await ctx.runQuery(internalAny.applications.getApplicationsForEarningCheck, {
                cursor,
                numItems: 50,
            });

            const applications = result.page;
            cursor = result.continueCursor;
            isDone = result.isDone;

            for (const app of applications) {
                // Early check: Skip if no budget remaining for this campaign
                const campaign = await ctx.runQuery(internalAny.campaigns.getCampaign, {
                    campaignId: app.campaign_id
                });

                if (!campaign) {
                    console.warn(`Campaign ${app.campaign_id} not found, skipping app ${app._id}`);
                    continue;
                }

                const remainingBudget = campaign.total_budget - campaign.budget_claimed;
                if (remainingBudget <= 0) {
                    console.log(`No budget remaining for campaign ${app.campaign_id}, skipping scrape for app ${app._id}`);
                    continue;
                }

                let totalViews = 0;
                let totalLikes = 0;
                let totalComments = 0;
                let totalShares = 0;
                let hasValidData = false;

                // Scrape IG
                if (app.ig_post_url) {
                    try {
                        const reels = await ctx.runAction(api.instagram.getInstagramReels, {
                            link: app.ig_post_url,
                        });

                        if (reels && reels.length > 0) {
                            const reel = reels[0];

                            // Verify tracking tag if present
                            const caption = (reel.caption || "") as string;
                            if (app.tracking_tag && !caption.includes(app.tracking_tag)) {
                                console.warn(`IG post for app ${app._id} missing tracking tag: ${app.tracking_tag}`);
                                // Skip this post - tracking tag not verified
                            } else {
                                const views = (reel.playCount || 0) as number;
                                const likes = (reel.likesCount || 0) as number;
                                const comments = (reel.commentsCount || 0) as number;
                                const shares = (reel.sharesCount || 0) as number;

                                totalViews = totalViews + views;
                                totalLikes = totalLikes + likes;
                                totalComments = totalComments + comments;
                                totalShares = totalShares + shares;
                                hasValidData = true;
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to scrape IG for app ${app._id}:`, e);
                    }
                }

                // Scrape TikTok
                if (app.tiktok_post_url) {
                    try {
                        const tiktokPost = await ctx.runAction(api.tiktok.getTiktokPost, {
                            url: app.tiktok_post_url,
                        });

                        if (tiktokPost) {
                            // Verify tracking tag if present
                            const description = (tiktokPost.desc || tiktokPost.description || "") as string;
                            if (app.tracking_tag && !description.includes(app.tracking_tag)) {
                                console.warn(`TikTok post for app ${app._id} missing tracking tag: ${app.tracking_tag}`);
                                // Skip this post - tracking tag not verified
                            } else {
                                const views = (tiktokPost.playCount || 0) as number;
                                const likes = (tiktokPost.diggCount || 0) as number;
                                const comments = (tiktokPost.commentCount || 0) as number;
                                const shares = (tiktokPost.shareCount || 0) as number;

                                totalViews = totalViews + views;
                                totalLikes = totalLikes + likes;
                                totalComments = totalComments + comments;
                                totalShares = totalShares + shares;
                                hasValidData = true;
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to scrape TikTok for app ${app._id}:`, e);
                    }
                }

                // Save aggregated stats if we have valid data
                if (hasValidData) {
                    const stats = {
                        views: totalViews,
                        likes: totalLikes,
                        comments: totalComments,
                        shares: totalShares,
                    };

                    // 1. App Analytics
                    await ctx.runMutation(internalAny.analytics.saveDailyAppStats, {
                        applicationId: app._id,
                        ...stats
                    });

                    // 2. Campaign Analytics
                    await ctx.runMutation(internalAny.analytics.saveDailyCampaignStats, {
                        campaignId: app.campaign_id,
                        ...stats
                    });

                    // 3. Business Analytics
                    await ctx.runMutation(internalAny.analytics.saveDailyBusinessStats, {
                        businessId: campaign.business_id,
                        ...stats
                    });

                    // 4. Calculate and update earnings
                    const newEarning = calculateEarning(
                        totalViews,
                        campaign.payout_thresholds,
                        app.userCampaignMaxPayout
                    );

                    await ctx.runMutation(internalAny.applications.updateApplicationEarning, {
                        applicationId: app._id,
                        campaignId: app.campaign_id,
                        userCampaignStatusId: app.campaignStatusId,
                        newEarning,
                        userCampaignMaxPayout: app.userCampaignMaxPayout,
                        views: totalViews,
                        likes: totalLikes,
                        comments: totalComments,
                        shares: totalShares,
                    });
                }


            }
        }
    },
});

crons.cron(
    "daily scrape",
    "15 0 * * *", // 12:15 AM
    (internal as any).crons.runDailyScrape,
);

export default crons;
