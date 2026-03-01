import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";

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
