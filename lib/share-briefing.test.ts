import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dataUrlToPngBlob } from "./share-briefing.ts";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

describe("dataUrlToPngBlob", () => {
  it("decodes a PNG data URL into an image/png blob", () => {
    const blob = dataUrlToPngBlob(PIXEL);

    assert.equal(blob.type, "image/png");
    assert.ok(blob.size > 0);
  });
});
