"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ApifyClient } from "apify-client";

export const getTiktokPost = action({
    args: { url: v.string() },
    handler: async (ctx, args) => {
        const apifyToken = process.env.APIFY_API_TOKEN;
        if (!apifyToken) {
            throw new Error("Missing APIFY_API_TOKEN environment variable");
        }

        const client = new ApifyClient({
            token: apifyToken,
        });

        // Prepare input for clockworks/tiktok-scraper
        // Just providing postURLs as requested by user
        const input = {
            "postURLs": [
                args.url
            ],
            // Defaulting others to minimize cost/time if possible, 
            // though the actor might have its own defaults.
            // Keeping it simple as per request.
        };

        const run = await client.actor("clockworks/tiktok-scraper").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (items.length === 0) {
            return null;
        }

        return items[0];
    },
});
