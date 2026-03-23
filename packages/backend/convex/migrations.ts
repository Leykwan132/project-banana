import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { internalMutation } from "./_generated/server.js";
import type { DataModel } from "./_generated/dataModel.js";
import { aggregateCampaignByBusiness } from "./analytics";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

export const clearAggregateCampaignByBusiness = internalMutation({
    args: {},
    handler: async (ctx) => {
        console.log("[aggregateCampaignByBusiness] clearing aggregate tree");
        await aggregateCampaignByBusiness.clear(ctx);
        console.log("[aggregateCampaignByBusiness] clear complete");
    },
});

export const backfillAggregateCampaignByBusiness = migrations.define({
    table: "campaign_analytics_daily",
    migrateOne: async (ctx, doc) => {
        console.log("[aggregateCampaignByBusiness] backfilling row", {
            id: doc._id,
            businessId: doc.business_id,
            campaignId: doc.campaign_id,
            date: doc.date,
            views: doc.views,
        });
        await aggregateCampaignByBusiness.insertIfDoesNotExist(ctx, doc);
    },
});
