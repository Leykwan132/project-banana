import { expect, test } from "bun:test";
import { connectionAge } from "../src/lib/accountConnectionAge";

const now = Date.UTC(2026, 9, 5, 12);
const day = 86400000;
test("connection age counts complete days and handles new connections", () => {
  expect(connectionAge(now - 3 * day, now)).toBe("Connected 3 days ago");
  expect(connectionAge(now - day, now)).toBe("Connected 1 day ago");
  expect(connectionAge(now - day + 1, now)).toBe("Connected 23 hours ago");
  expect(connectionAge(now + day, now)).toBe("Connected 0 hours ago");
});

test("connections without a date do not show an invented age", () => {
  expect(connectionAge(undefined, now)).toBe("Connected");
});

test("recent connections show elapsed hours with singular and plural labels", () => {
  expect(connectionAge(now - 3600000, now)).toBe("Connected 1 hour ago");
  expect(connectionAge(now - 2 * 3600000, now)).toBe("Connected 2 hours ago");
  expect(connectionAge(now - 30 * 60000, now)).toBe("Connected 0 hours ago");
});
