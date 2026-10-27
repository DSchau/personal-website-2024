import assert from "node:assert/strict";
import test from "node:test";

import {
  getUtcYearBounds,
  isDateInUtcYear,
} from "../src/lib/commit-date.ts";

test("the UTC year range includes commits late on December 31", () => {
  const { start, endExclusive, endInclusive } = getUtcYearBounds(2024);

  assert.equal(start.toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(endExclusive.toISOString(), "2025-01-01T00:00:00.000Z");
  assert.equal(endInclusive.toISOString(), "2024-12-31T23:59:59.999Z");
  assert.equal(
    isDateInUtcYear(new Date("2024-12-31T23:59:59.000Z"), 2024),
    true
  );
});

test("the UTC year range excludes the first instant of the next year", () => {
  assert.equal(
    isDateInUtcYear(new Date("2025-01-01T00:00:00.000Z"), 2024),
    false
  );
});

test("invalid commit dates are not counted", () => {
  assert.equal(isDateInUtcYear(new Date("not a date"), 2024), false);
});
