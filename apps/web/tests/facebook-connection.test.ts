import { expect, test } from "bun:test";
import { facebookLoginFeedback } from "../src/lib/facebookConnection";

test("Facebook OAuth feedback uses fixed safe messages", () => {
  expect(facebookLoginFeedback("choose_page")?.color).toBe("success");
  expect(facebookLoginFeedback("no_pages")?.description).toContain("Page");
  expect(facebookLoginFeedback("PRIVATE_TOKEN")).toBeNull();
  expect(facebookLoginFeedback("invalid_state")?.color).toBe("danger");
});
