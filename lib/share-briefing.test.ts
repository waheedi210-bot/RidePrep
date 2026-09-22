import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dataUrlToPngBlob,
  formatShareDate,
  formatShareTime,
} from "./share-briefing.ts";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

describe("dataUrlToPngBlob", () => {
  it("decodes a PNG data URL into an image/png blob", () => {
    const blob = dataUrlToPngBlob(PIXEL);

    assert.equal(blob.type, "image/png");
    assert.ok(blob.size > 0);
  });
});

describe("formatShareDate", () => {
  it("formats a YMD date for the share card", () => {
    assert.equal(formatShareDate("2026-09-23"), "Wed, Sep 23");
  });
});

describe("formatShareTime", () => {
  it("formats a 24-hour roll-out as a 12-hour clock", () => {
    assert.equal(formatShareTime("06:30"), "6:30 AM");
    assert.equal(formatShareTime("18:05"), "6:05 PM");
  });
});
