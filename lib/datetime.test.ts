import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatHourLabel,
  fromZonedFields,
  toZonedDateInput,
  toZonedTimeInput,
  tomorrowAt,
} from "./datetime.ts";

describe("fromZonedFields", () => {
  it("converts a London winter morning to UTC", () => {
    const instant = fromZonedFields("2026-01-17", "06:30", "Europe/London");

    assert.equal(instant.toISOString(), "2026-01-17T06:30:00.000Z");
  });

  it("converts a London summer morning across BST", () => {
    const instant = fromZonedFields("2026-07-18", "06:30", "Europe/London");

    assert.equal(instant.toISOString(), "2026-07-18T05:30:00.000Z");
  });

  it("round-trips date and time inputs", () => {
    const instant = fromZonedFields("2026-07-18", "06:30", "Europe/London");

    assert.equal(toZonedDateInput(instant, "Europe/London"), "2026-07-18");
    assert.equal(toZonedTimeInput(instant, "Europe/London"), "06:30");
    assert.equal(formatHourLabel(instant, "Europe/London"), "06:30");
  });
});

describe("tomorrowAt", () => {
  it("returns the next calendar day at the requested wall time", () => {
    const now = new Date("2026-09-18T12:00:00.000Z");
    const next = tomorrowAt("06:30", "Europe/London", now);

    assert.equal(toZonedDateInput(next, "Europe/London"), "2026-09-19");
    assert.equal(toZonedTimeInput(next, "Europe/London"), "06:30");
  });
});
