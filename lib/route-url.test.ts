import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRouteUrl } from "./route-url.ts";

describe("resolveRouteUrl", () => {
  it("maps a Ride with GPS route page to the public GPX", () => {
    const resolved = resolveRouteUrl("https://ridewithgps.com/routes/12345678");

    assert.equal(resolved.provider, "rwgps");
    assert.equal(resolved.fetchUrl, "https://ridewithgps.com/routes/12345678.gpx");
  });

  it("tells the rider to export GPX from Strava", () => {
    const resolved = resolveRouteUrl("https://www.strava.com/routes/987");

    assert.equal(resolved.provider, "strava");
    assert.match(resolved.stravaHint ?? "", /Export GPX/);
  });

  it("rejects an unknown host", () => {
    assert.throws(
      () => resolveRouteUrl("https://example.com/routes/1"),
      /Ride with GPS/,
    );
  });
});
