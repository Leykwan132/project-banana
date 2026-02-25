import { cronJobs } from "convex/server";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const crons = cronJobs();

export const runDailyScrape = internalAction({
    args: {},
    handler: async (ctx) => {
        console.log("Starting daily scrape cron job");

        let continueCursor: string | null = null;
        let isDone = false;

        while (!isDone) {
            console.log(`Processing batch starting from cursor: ${continueCursor ?? "start"}`);

            let page: Array<{
                _id: any;
                user_id: string;
                campaign_id: any;
                campaignStatusId: any;
                userCampaignMaxPayout: number;
                ig_post_url?: string;
                tiktok_post_url?: string;
                tracking_tag?: string;
            }>;

            ({ page, continueCursor, isDone } = await ctx.runQuery(internal.applications.getApplicationsForEarningCheck, {
                paginationOpts: { cursor: continueCursor, numItems: 50 },
            }));

            console.log(`Retrieved ${page.length} applications from database`);

            for (const app of page) {
                console.log(`\n--- Processing Application ${app._id} ---`);
                // Early check: Skip if no budget remaining for this campaign
                const campaign = await ctx.runQuery(api.campaigns.getCampaign, {
                    campaignId: app.campaign_id
                });

                if (!campaign) {
                    console.warn(`Campaign ${app.campaign_id} not found, skipping app ${app._id}`);
                    continue;
                }

                const remainingBudget = campaign.total_budget - campaign.budget_claimed;
                console.log(`Campaign: ${campaign.name} | Budget: ${campaign.budget_claimed}/${campaign.total_budget} (Remaining: ${remainingBudget})`);

                if (remainingBudget <= 0) {
                    console.log(`No budget remaining for campaign ${app.campaign_id}, skipping scrape`);
                    continue;
                }

                let totalViews = 5000;
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

                        console.log(`IG Scraped for app ${app._id}: ${JSON.stringify(reels)}`);

                        if (reels && reels.length > 0) {
                            const reel = reels[0];

                            // Verify tracking tag if present
                            const caption = (reel.caption || "") as string;
                            if (app.tracking_tag && !caption.toLowerCase().includes(app.tracking_tag.toLowerCase())) {
                                console.warn(`IG post for app ${app._id} missing tracking tag: ${app.tracking_tag}`);
                                // Skip this post - tracking tag not verified
                            } else {
                                const views = (reel.videoPlayCount || 0) as number;
                                const likes = (reel.likesCount || 0) as number;
                                const comments = (reel.commentsCount || 0) as number;
                                const shares = (reel.sharesCount || 0) as number;

                                console.log(`IG Scraped for app ${app._id}: Views=${views}, Likes=${likes}, Comments=${comments}, Shares=${shares}`);

                                totalViews = totalViews + views;
                                totalLikes = totalLikes + likes;
                                totalComments = totalComments + comments;
                                totalShares = totalShares + shares;
                                hasValidData = true;
                            }
                        } else {
                            console.log("No IG reel data found for this URL");
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

                        console.log(`TikTok Scraped: ${JSON.stringify(tiktokPost)}`);

                        if (tiktokPost) {
                            // Verify tracking tag if present
                            let isTrackingTagValid = true;
                            const description = (tiktokPost.desc || tiktokPost.description || "") as string;

                            if (app.tracking_tag) {
                                const trackingTagLower = app.tracking_tag.toLowerCase();
                                const hashtags = (tiktokPost.hashtags || []) as Array<{ name?: string }>;

                                // Check in hashtags array, fallback to description text
                                isTrackingTagValid = hashtags.some(ht => ht.name?.toLowerCase() === trackingTagLower) || description.toLowerCase().includes(trackingTagLower);
                            }

                            if (!isTrackingTagValid) {
                                console.warn(`TikTok post for app ${app._id} missing tracking tag: ${app.tracking_tag}`);
                                // Skip this post - tracking tag not verified
                            } else {

                                console.log('tracking tag found', app.tracking_tag);
                                console.log('description', description);

                                const views = (tiktokPost.playCount || 0) as number;
                                const likes = (tiktokPost.diggCount || 0) as number;
                                const comments = (tiktokPost.commentCount || 0) as number;
                                const shares = (tiktokPost.shareCount || 0) as number;

                                console.log(`TikTok Scraped: Views=${views}, Likes=${likes}, Comments=${comments}, Shares=${shares}`);

                                totalViews = totalViews + views;
                                totalLikes = totalLikes + likes;
                                totalComments = totalComments + comments;
                                totalShares = totalShares + shares;
                                hasValidData = true;
                            }
                        } else {
                            console.log("No TikTok post data found for this URL");
                        }
                    } catch (e) {
                        console.error(`Failed to scrape TikTok for app ${app._id}:`, e);
                    }
                }

                // Save aggregated stats if we have valid data
                if (hasValidData) {
                    console.log(`Saving aggregated stats for app ${app._id}: Views=${totalViews}, Likes=${totalLikes}, Comments=${totalComments}, Shares=${totalShares}`);

                    // 1. Compute earnings first so we can propagate the delta to all analytics tables
                    const earningResult = await ctx.runMutation(internal.applications.updateApplicationEarning, {
                        applicationId: app._id,
                        campaignId: app.campaign_id,
                        userCampaignStatusId: app.campaignStatusId,
                        views: totalViews,
                        likes: totalLikes,
                        comments: totalComments,
                        shares: totalShares,
                    });
                    const totalEarnings = earningResult?.earnings ?? 0;
                    console.log(`Earning delta for app ${app._id}: ${totalEarnings}`);

                    const stats = {
                        views: totalViews,
                        likes: totalLikes,
                        comments: totalComments,
                        shares: totalShares,
                        earnings: totalEarnings,
                    };

                    // 2. App Analytics
                    await ctx.runMutation(api.analytics.saveDailyAppStats, {
                        applicationId: app._id,
                        campaignId: app.campaign_id,
                        ...stats
                    });

                    // 3. Campaign Analytics
                    await ctx.runMutation(api.analytics.saveDailyCampaignStats, {
                        campaignId: app.campaign_id,
                        ...stats
                    });

                    // 4. Business Analytics
                    await ctx.runMutation(api.analytics.saveDailyBusinessStats, {
                        businessId: campaign.business_id,
                        ...stats
                    });

                    // 5. Creator Analytics
                    await ctx.runMutation(api.analytics.saveDailyCreatorStats, {
                        userId: app.user_id,
                        ...stats
                    });

                    console.log(`Successfully updated all database records for app ${app._id}`);
                } else {
                    console.log(`No valid data to save for app ${app._id}`);
                }


            }
            console.log(`Finished batch processing. isDone: ${isDone}`);
        }

        console.log("Finished daily scrape cron job");
    },
});

crons.cron(
    "daily scrape",
    "15 0 * * *", // 12:15 AM
    (internal as any).crons.runDailyScrape,
);

export default crons;
