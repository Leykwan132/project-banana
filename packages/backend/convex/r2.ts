import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";

const r2 = new R2((components as typeof components & { r2: ConstructorParameters<typeof R2>[0] }).r2);

export const generateUploadUrl = async (key: string, contentType: string) => {
    void contentType;

    const { url } = await r2.generateUploadUrl(key);
    return url;
};

export const generateDownloadUrl = async (key: string) => {
    return await r2.getUrl(key, { expiresIn: 3600 });
};

export const deleteObject = async (ctx: Parameters<typeof r2.deleteObject>[0], key: string) => {
    await r2.deleteObject(ctx, key);
};

export const getMetadata = query({
    args: {
        key: v.string(),
    },
    handler: async (ctx, args) => {
        return await r2.getMetadata(ctx, args.key);
    },
});