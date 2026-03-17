import { action } from "./_generated/server";
import { v } from "convex/values";

const APIFY_API_BASE_URL = "https://api.apify.com/v2";

function getApifyToken(): string {
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        throw new Error("Missing APIFY_API_TOKEN environment variable");
    }

    return apifyToken;
}

function normalizeActorId(actorId: string): string {
    return actorId.replace(/\//g, "~");
}

async function runApifyActorAndGetDatasetItems<T>(
    actorId: string,
    input: Record<string, unknown>,
    apifyToken: string,
): Promise<T[]> {
    const response = await fetch(
        `${APIFY_API_BASE_URL}/acts/${normalizeActorId(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(apifyToken)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
        },
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apify actor ${actorId} failed: ${errorText}`);
    }

    return (await response.json()) as T[];
}

export const getTiktokPost = action({
    args: { url: v.string() },
    // @ts-ignore
    handler: async (ctx, args) => {
        const apifyToken = getApifyToken();

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

        const items = await runApifyActorAndGetDatasetItems<Record<string, unknown>>(
            "clockworks/tiktok-scraper",
            input,
            apifyToken,
        );

        if (items.length === 0) {
            return null;
        }

        return items[0];
    },
});
