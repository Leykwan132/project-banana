import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";
import stripe from "@convex-dev/stripe/convex.config.js";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(workOSAuthKit);
app.use(stripe);
app.use(aggregate, { name: "aggregateCampaignAnalytics" });
app.use(aggregate, { name: "aggregateCampaignByBusiness" });
app.use(aggregate, { name: "aggregateBusinessAnalytics" });
app.use(aggregate, { name: "aggregateApplicationAnalytics" });
app.use(aggregate, { name: "aggregateApplicationByBusiness" });
app.use(aggregate, { name: "aggregateApplicationByCampaign" });
app.use(aggregate, { name: "aggregateUserCampaignStatusByCampaign" });
app.use(aggregate, { name: "aggregateCreatorAnalytics" });

export default app;
