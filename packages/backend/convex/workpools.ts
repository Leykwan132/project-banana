import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

export const scrapePool = new Workpool((components as any).scrapeWorkpool, {
    maxParallelism: 3,
    logLevel: "INFO",
    retryActionsByDefault: true,
    defaultRetryBehavior: {
        maxAttempts: 4,
        initialBackoffMs: 5_000,
        base: 2,
    },
});

export const notificationPool = new Workpool((components as any).notificationWorkpool, {
    maxParallelism: 5,
    logLevel: "INFO",
});

export const emailPool = new Workpool((components as any).emailWorkpool, {
    maxParallelism: 2,
    logLevel: "INFO",
});
