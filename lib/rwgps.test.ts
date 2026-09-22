import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseRwgpsJson } from "./rwgps.ts";

describe("parseRwgpsJson", () => {
  it("uses official distance and elevation, not cue-point geometry", () => {
    const route = parseRwgpsJson({
      name: "GF MD Gran Route 2026",
      distance: 137218,
      elevation_gain: 2425.68,
      locality: "Frederick",
      administrative_area: "MD",
      country_code: "US",
      first_lat: 39.41617,
      first_lng: -77.4193,
      activity_types: ["cycling:road"],
      track_points: [
        { x: -77.4193, y: 39.41617, e: 89.1, d: 0 },
        { x: -77.42, y: 39.42, e: 120, d: 5000 },
        { x: -77.43, y: 39.45, e: 200, d: 137218 },
      ],
    });

    assert.equal(route.name, "GF MD Gran Route 2026");
    assert.equal(route.region, "Frederick, MD");
    assert.equal(route.lat, 39.41617);
    assert.equal(route.lng, -77.4193);
    assert.equal(route.distanceKm, 137.2);
    assert.equal(route.elevationGainM, 2426);
    assert.equal(route.points.length, 3);
  });
});
