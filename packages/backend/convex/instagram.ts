"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ApifyClient } from "apify-client";

export const getInstagramProfile = action({
    args: { url: v.string() },
    handler: async (ctx, args) => {
        const apifyToken = process.env.APIFY_API_TOKEN;
        if (!apifyToken) {
            throw new Error("Missing APIFY_API_TOKEN environment variable");
        }

        const client = new ApifyClient({
            token: apifyToken,
        });

        // Extract username from URL
        // Supported formats: instagram.com/username, https://www.instagram.com/username/ etc.
        let username = args.url;
        try {
            const urlObj = new URL(args.url.startsWith('http') ? args.url : `https://${args.url}`);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
                username = pathParts[0];
            }
        } catch (e) {
            // If it's not a URL, assume it's the username or handle accordingly
            // But strict requirement says "provided 1 url", so we try to parse.
            // If parse fails, we might just use the input string if it looks like a username, 
            // but safer to error if it's strictly supposed to be a URL.
            // However, the user snippet used "humansofny", so maybe we should be flexible.
            // Let's assume broad compatibility: if URL parsing fails, stick with original string.
            console.log("Could not parse as URL, using input as username");
        }

        // Clean query params if any slipped through simple splitting (URL object handles this mostly)

        const input = {
            "usernames": [
                username
            ]
        };

        // Run the Actor and wait for it to finish
        const run = await client.actor("apify/instagram-profile-scraper").call(input);

        // Fetch and print Actor results from the run's dataset (if any)
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (items.length === 0) {
            return null;
        }

        return items[0];
    },
});

export const getInstagramReels = action({
    args: {
        link: v.string(),
    },
    handler: async (ctx, args) => {
        const apifyToken = process.env.APIFY_API_TOKEN;
        if (!apifyToken) {
            throw new Error("Missing APIFY_API_TOKEN environment variable");
        }

        const client = new ApifyClient({
            token: apifyToken,
        });

        const input = {
            "username": [
                args.link
            ],
            "includeSharesCount": true,
            "resultsLimit": 1
        };

        const run = await client.actor("apify/instagram-reel-scraper").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        return items;
    },
});
