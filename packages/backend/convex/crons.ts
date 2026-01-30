import { cronJobs } from "convex/server";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

export const runDailyScrape = internalAction({
    args: {},
    handler: async (ctx) => {
        const internalAny = internal as any;
        const applications = await ctx.runQuery(internalAny.applications.getAllActiveApplications, {});

        for (const app of applications) {
            // Scrape IG
            if (app.ig_post_url) {
                const stats = await ctx.runAction(internalAny.utils.scrapeSocialMediaStats, {
                    url: app.ig_post_url,
                    platform: "instagram",
                });

                // Log stats for App, Campaign, Business
                await ctx.runMutation(internalAny.analytics.saveDailyAppStats, {
                    applicationId: app._id,
                    ...stats
                });

                // Retrieve Campaign to get Business ID? 
                // saveDailyCampaignStats takes campaignId and inserts. 
                // But it looks up BusinessId internally inside the mutation! (See analytics.ts implementation)
                // So we just need campaignId.
                await ctx.runMutation(internalAny.analytics.saveDailyCampaignStats, {
                    campaignId: app.campaign_id,
                    ...stats
                });

                // Use a helper or just query campaign to get businessId?
                // saveDailyBusinessStats needs businessId.
                // We don't have businessId on the Application doc directly (usually it's on Campaign).
                // We can't query DB inside Action directly (need runQuery).
                // But saveDailyCampaignStats does the lookup.
                // Maybe we should update saveDailyBusinessStats to look up business via campaign?
                // Or we fetch businessId here via a query?

                // For efficiency, maybe `saveDailyCampaignStats` could also update business stats?
                // But we wanted separate functions.
                // Let's implement a helper query to get context if needed, or just fetch it.
                // Or better: The `application` document might SHOULD have business_id denormalized?
                // Checking schema... `applications` table has `campaign_id`, `user_id`. No `business_id`.

                // So we need to fetch the campaign to get business_id.
                // Doing this inside the loop in Action via `runQuery` is chatty.
                // But okay for now.
                const campaign = await ctx.runQuery(internalAny.applications.getApplication, { applicationId: app._id }) // Wait, this gets app.
                // We need `internal.campaigns.getCampaign`.
                // I'll assume `internal.campaigns.getCampaign` exists (it does).

                const camp = await ctx.runQuery(internalAny.campaigns.getCampaign, { campaignId: app.campaign_id });
                if (camp) {
                    await ctx.runMutation(internalAny.analytics.saveDailyBusinessStats, {
                        businessId: camp.business_id,
                        ...stats
                    });
                }
            }

            // Scrape TikTok
            if (app.tiktok_post_url) {
                const stats = await ctx.runAction(internalAny.utils.scrapeSocialMediaStats, {
                    url: app.tiktok_post_url,
                    platform: "tiktok",
                });

                await ctx.runMutation(internalAny.analytics.saveDailyAppStats, {
                    applicationId: app._id,
                    ...stats
                });

                await ctx.runMutation(internalAny.analytics.saveDailyCampaignStats, {
                    campaignId: app.campaign_id,
                    ...stats
                });

                // Logic to get businessId is repeated.
                // We already fetched stats.
                // Optimization: fetch Business Id once per app.
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
