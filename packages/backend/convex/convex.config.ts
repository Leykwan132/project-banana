import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";

const app = defineApp();
app.use(workOSAuthKit);
app.use(aggregate, { name: "aggregateCampaignAnalytics" });
app.use(aggregate, { name: "aggregateBusinessAnalytics" });
app.use(aggregate, { name: "aggregateApplicationAnalytics" });

export default app;