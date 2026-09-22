import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  observeAir,
  pollenLevel,
  recommendAirHealth,
  sliceAirHourlyFromStart,
  usAqiBand,
  type OpenMeteoAirHourly,
} from "./air-quality.ts";

describe("usAqiBand", () => {
  it("uses EPA breakpoints", () => {
    assert.equal(usAqiBand(42), "good");
    assert.equal(usAqiBand(50), "good");
    assert.equal(usAqiBand(78), "moderate");
    assert.equal(usAqiBand(112), "usg");
    assert.equal(usAqiBand(168), "unhealthy");
    assert.equal(usAqiBand(250), "very-unhealthy");
    assert.equal(usAqiBand(320), "hazardous");
  });
});

describe("pollenLevel", () => {
  it("hides missing CAMS values and buckets grains/m³", () => {
    assert.equal(pollenLevel(null), null);
    assert.equal(pollenLevel(0), "none");
    assert.equal(pollenLevel(12), "low");
    assert.equal(pollenLevel(32), "moderate");
    assert.equal(pollenLevel(80), "high");
    assert.equal(pollenLevel(140), "very-high");
  });
});

describe("recommendAirHealth", () => {
  const morning = observeAir({
    time: "2026-09-22T10:00:00Z",
    usAqi: 38,
    usAqiPm25: 36,
    usAqiOzone: 20,
    pm25: 7,
    ozone: 40,
  });
  const afternoon = observeAir({
    time: "2026-09-22T17:00:00Z",
    usAqi: 118,
    usAqiPm25: 40,
    usAqiOzone: 118,
    pm25: 9,
    ozone: 140,
  });

  it("calls out ozone as the limiter when it drives the peak AQI", () => {
    const advice = recommendAirHealth([morning, afternoon], "UTC");

    assert.ok(advice);
    assert.equal(advice.band, "usg");
    assert.equal(advice.severity, "caution");
    assert.equal(advice.pollutant, "ozone");
    assert.equal(advice.peakTime, "17:00");
    assert.match(advice.detail, /Ozone is the limiter/);
    assert.equal(advice.pollen.length, 0);
  });

  it("stays quiet on a clean US window with no pollen columns", () => {
    const advice = recommendAirHealth(
      [
        observeAir({
          time: "2026-09-22T10:00:00Z",
          usAqi: 28,
          pm25: 5,
          ozone: 30,
        }),
      ],
      "America/New_York",
    );

    assert.ok(advice);
    assert.equal(advice.severity, "ok");
    assert.equal(advice.pollen.length, 0);
    assert.match(advice.headline, /good/i);
  });

  it("adds a grass-pollen caution when CAMS reports high grains", () => {
    const advice = recommendAirHealth(
      [
        observeAir({
          time: "2026-06-12T08:00:00Z",
          usAqi: 44,
          pm25: 8,
          ozone: 50,
          grassPollen: 88,
          birchPollen: 4,
        }),
      ],
      "Europe/London",
    );

    assert.ok(advice);
    assert.equal(advice.severity, "caution");
    assert.equal(advice.pollen[0]?.kind, "Grass");
    assert.equal(advice.pollen[0]?.level, "high");
    assert.match(advice.detail, /Grass pollen is high/);
  });

  it("tells the rider not to start when AQI is very unhealthy", () => {
    const advice = recommendAirHealth(
      [
        observeAir({
          time: "2026-09-22T14:00:00Z",
          usAqi: 240,
          usAqiPm25: 240,
          pm25: 160,
          ozone: 40,
        }),
      ],
      "UTC",
    );

    assert.ok(advice);
    assert.equal(advice.severity, "stop");
    assert.match(advice.headline, /Do not ride/);
  });
});

describe("sliceAirHourlyFromStart", () => {
  const hourly: OpenMeteoAirHourly = {
    time: ["2026-09-22T09:00", "2026-09-22T10:00", "2026-09-22T11:00"],
    us_aqi: [30, 42, 55],
    pm2_5: [6, 7, 9],
    ozone: [40, 48, 60],
  };

  it("includes the hour that contains a half-past roll-out", () => {
    const sliced = sliceAirHourlyFromStart(
      hourly,
      new Date("2026-09-22T09:30:00Z"),
      2,
      "UTC",
    );

    assert.ok("hours" in sliced);
    assert.equal(sliced.hours.length, 2);
    assert.equal(sliced.hours[0].usAqi, 30);
    assert.equal(sliced.hours[1].usAqi, 42);
  });
});
