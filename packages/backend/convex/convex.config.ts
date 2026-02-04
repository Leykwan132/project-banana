import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";
import stripe from "@convex-dev/stripe/convex.config.js";

const app = defineApp();
app.use(workOSAuthKit);
app.use(stripe);
app.use(aggregate, { name: "aggregateCampaignAnalytics" });
app.use(aggregate, { name: "aggregateBusinessAnalytics" });
app.use(aggregate, { name: "aggregateApplicationAnalytics" });

export default app;