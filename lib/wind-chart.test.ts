import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatHourClock,
  niceWindMaxMph,
  seriesPath,
  windChartPoints,
  xLabelIndexes,
} from "./wind-chart.ts";

describe("formatHourClock", () => {
  it("converts 24-hour stamps to a 12-hour clock", () => {
    assert.equal(formatHourClock("08:00"), "8:00 AM");
    assert.equal(formatHourClock("12:00"), "12:00 PM");
    assert.equal(formatHourClock("00:00"), "12:00 AM");
    assert.equal(formatHourClock("16:30"), "4:30 PM");
  });
});

describe("niceWindMaxMph", () => {
  it("rounds up to a readable 5 mph ceiling", () => {
    assert.equal(niceWindMaxMph(8), 10);
    assert.equal(niceWindMaxMph(16.2), 20);
    assert.equal(niceWindMaxMph(25), 25);
  });
});

describe("windChartPoints", () => {
  it("converts kph series to mph and keeps gusts at or above speed", () => {
    const points = windChartPoints([
      {
        time: "08:00",
        tempC: 18,
        feelsLikeC: 18,
        windKph: 16.09,
        gustKph: 32.19,
        windFromDeg: 220,
        precipChance: 0,
        humidityPct: 50,
        dewPointC: 8,
        uvIndex: 3,
      },
    ]);

    assert.equal(points[0].label, "8:00 AM");
    assert.ok(Math.abs(points[0].speedMph - 10) < 0.05);
    assert.ok(Math.abs(points[0].gustMph - 20) < 0.05);
  });
});

describe("seriesPath", () => {
  it("draws a two-point line from left to right", () => {
    const path = seriesPath([0, 20], 20, 0, 0, 100, 100);

    assert.equal(path, "M0.0 100.0 L100.0 0.0");
  });
});

describe("xLabelIndexes", () => {
  it("keeps short series fully labelled and thins long ones", () => {
    assert.deepEqual(xLabelIndexes(3), [0, 1, 2]);
    assert.deepEqual(xLabelIndexes(8), [0, 3, 6, 7]);
  });
});
