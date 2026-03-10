import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import stripe from "@convex-dev/stripe/convex.config.js";
import betterAuth from "@convex-dev/better-auth/convex.config";
import r2 from "@convex-dev/r2/convex.config.js";
import pushNotifications from "@convex-dev/expo-push-notifications/convex.config.js";
import posthog from "@posthog/convex/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";

const app = defineApp();
app.use(betterAuth);
app.use(stripe);
app.use(r2);
app.use(pushNotifications);
app.use(posthog);
app.use(resend);
app.use(aggregate, { name: "aggregateCampaignAnalytics" });
app.use(aggregate, { name: "aggregateCampaignByBusiness" });
app.use(aggregate, { name: "aggregateBusinessAnalytics" });
app.use(aggregate, { name: "aggregateApplicationAnalytics" });
app.use(aggregate, { name: "aggregateApplicationByBusiness" });
app.use(aggregate, { name: "aggregateApplicationByCampaign" });
app.use(aggregate, { name: "aggregateUserCampaignStatusByCampaign" });
app.use(aggregate, { name: "aggregateCreatorAnalytics" });

export default app;
