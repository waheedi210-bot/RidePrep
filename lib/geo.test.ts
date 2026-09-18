import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bearingDeg,
  elevationGainM,
  haversineKm,
  sampleHourlyPoints,
  totalDistanceKm,
} from "./geo.ts";

describe("haversineKm", () => {
  it("measures a short Peak District hop", () => {
    const km = haversineKm(
      { lat: 53.3278, lng: -1.7597 },
      { lat: 53.349, lng: -1.78 },
    );

    assert.ok(km > 2);
    assert.ok(km < 4);
  });
});

describe("bearingDeg", () => {
  it("points west-northwest along the Winnats outbound", () => {
    const bearing = bearingDeg(
      { lat: 53.3278, lng: -1.7597 },
      { lat: 53.34, lng: -1.82 },
    );

    assert.ok(bearing > 270);
    assert.ok(bearing < 320);
  });
});

describe("elevationGainM", () => {
  it("ignores sub-3 m GPS noise and sums real climbs", () => {
    const gain = elevationGainM([
      { lat: 0, lng: 0, eleM: 100 },
      { lat: 0, lng: 0.001, eleM: 102 },
      { lat: 0, lng: 0.002, eleM: 140 },
      { lat: 0, lng: 0.003, eleM: 138 },
      { lat: 0, lng: 0.004, eleM: 180 },
    ]);

    assert.equal(gain, 80);
  });
});

describe("sampleHourlyPoints", () => {
  it("returns the start, a mid-ride point, and does not overshoot", () => {
    const points = [
      { lat: 53.32, lng: -1.76 },
      { lat: 53.33, lng: -1.78 },
      { lat: 53.34, lng: -1.80 },
      { lat: 53.35, lng: -1.82 },
    ];
    const samples = sampleHourlyPoints(points, 3, 3);

    assert.equal(samples.length, 3);
    assert.equal(samples[0].lat, points[0].lat);
    assert.ok(totalDistanceKm(points) > 0);
    assert.ok(samples[2].lat <= points[points.length - 1].lat + 0.001);
  });
});
