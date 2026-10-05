import { expect, test } from "bun:test";
import { instagramLoginFeedback } from "../src/lib/instagramConnection";
test("OAuth feedback uses safe fixed messages and distinguishes success, cancellation and mismatch", () => {
  expect(instagramLoginFeedback("connected")?.color).toBe("success");
  expect(instagramLoginFeedback("cancelled")?.description).toContain("cancelled");
  expect(instagramLoginFeedback("account_mismatch")?.description).toContain("matching");
  expect(instagramLoginFeedback("https://evil.test/?token=PRIVATE")).toBeNull();
});
