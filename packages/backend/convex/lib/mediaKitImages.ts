import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
export function allowedImageUrl(input: string) {
  const u = new URL(input);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !["cdninstagram.com", "fbcdn.net"].some(
      (host) => u.hostname === host || u.hostname.endsWith(`.${host}`),
    )
  )
    throw Error("Unsupported image host.");
  return u.toString();
}
export async function cacheInstagramImage(
  ctx: ActionCtx,
  url?: string,
): Promise<Id<"_storage"> | undefined> {
  if (!url) return undefined;
  try {
    let next = allowedImageUrl(url);
    for (let hop = 0; hop < 4; hop++) {
      const response = await fetch(next, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      if (response.status >= 300 && response.status < 400) {
        next = allowedImageUrl(
          new URL(response.headers.get("location") ?? "", next).toString(),
        );
        continue;
      }
      const type = response.headers.get("content-type")?.split(";")[0];
      const max = 5 * 1024 * 1024;
      if (
        !response.ok ||
        !type ||
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
          "image/gif",
        ].includes(type) ||
        Number(response.headers.get("content-length") ?? 0) > max ||
        !response.body
      )
        return undefined;
      const reader = response.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > max) {
            await reader.cancel();
            return undefined;
          }
          chunks.push(new Uint8Array(value));
        }
      } finally {
        reader.releaseLock();
      }
      return await ctx.storage.store(new Blob(chunks, { type }));
    }
  } catch {
    /* A missing thumbnail must not discard valid profile statistics. */
  }
  return undefined;
}
