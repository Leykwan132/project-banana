import { expect, test } from "bun:test";
import { getFunctionName } from "convex/server";
import { call, mediaKitContext } from "./helpers/mediaKitContext";
import { startLogin, consumeState, saveConnection } from "../convex/instagramConnections";
import { completeLogin, oauthCallback } from "../convex/instagramOfficialActions";

test.each(["flat", "nested"])("OAuth exchange stores a private long-lived token and rejects replay (%s response)", async shape => {
  const old = globalThis.fetch;
  const ctx = mediaKitContext();
  process.env.INSTAGRAM_APP_ID = "test-id";
  process.env.INSTAGRAM_APP_SECRET = "test-secret";
  process.env.CONVEX_SITE_URL = "https://basic-mule-595.convex.site";
  process.env.SITE_URL = "https://lumina-app.my";
  ctx.runMutation = async (reference: any, args: any) => {
    const name = getFunctionName(reference);
    if (name === "instagramConnections:consumeState") return call(consumeState, ctx, args);
    if (name === "instagramConnections:saveConnection") return call(saveConnection, ctx, args);
    throw Error(`Unexpected mutation ${name}`);
  };
  const { url } = await call(startLogin, ctx);
  const state = new URL(url).searchParams.get("state")!;
  globalThis.fetch = (async (input: any, options: any) => {
    const url = new URL(String(input));
    if (url.origin === "https://api.instagram.com") {
      const body = new URLSearchParams(options.body);
      expect(body.get("code")).toBe("CODE");
      expect(body.get("redirect_uri")).toBe("https://basic-mule-595.convex.site/oauth/instagram/callback");
      expect(body.get("client_secret")).toBe("test-secret");
      const token = { access_token: "SHORT", user_id: "123", permissions: ["instagram_business_basic", "instagram_business_manage_insights"] };
      return new Response(JSON.stringify(shape === "flat" ? token : { data: [token] }));
    }
    if (url.pathname === "/access_token") return new Response(JSON.stringify({ access_token: "LONG_PRIVATE", expires_in: 5184000 }));
    return new Response(JSON.stringify({ user_id: "123", username: "sample" }));
  }) as typeof fetch;
  try {
    expect(await call(completeLogin, ctx, { state, code: "CODE", denied: false })).toBe("connected");
    const connection = [...ctx.rows.values()].find(row => row.table === "instagram_connections");
    expect(connection.access_token).toBe("LONG_PRIVATE");
    expect(connection.instagram_user_id).toBe("123");
    expect(await call(completeLogin, ctx, { state, code: "CODE", denied: false })).toBe("invalid_state");
  } finally { globalThis.fetch = old; }
});
test("callback returns only to the configured media kit route and never reflects OAuth secrets", async () => {
  process.env.SITE_URL = "https://lumina-app.my";
  const response = await call(oauthCallback, { runAction: async () => "invalid_state" }, new Request("https://basic-mule-595.convex.site/oauth/instagram/callback?code=PRIVATE&state=bad&redirect_uri=https://evil.test"));
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://lumina-app.my/creator/media-kit?instagram=invalid_state");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).not.toContain("PRIVATE");
});
