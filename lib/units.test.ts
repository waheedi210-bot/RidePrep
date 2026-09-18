import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  celsiusDeltaToFahrenheit,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatMph,
  formatTempF,
  kgToLb,
  kjToKcal,
  kmToMiles,
  kphToMph,
  lbToKg,
  metresToFeet,
  mlToFlOz,
  roundTo,
} from "./units.ts";

describe("imperial conversions", () => {
  it("converts freezing and boiling points", () => {
    assert.equal(celsiusToFahrenheit(0), 32);
    assert.equal(celsiusToFahrenheit(100), 212);
    assert.equal(roundTo(fahrenheitToCelsius(32), 0.0001), 0);
  });

  it("scales a Celsius drop without adding 32", () => {
    assert.equal(celsiusDeltaToFahrenheit(5), 9);
  });

  it("converts Winnats sample geometry to miles and feet", () => {
    assert.equal(roundTo(kmToMiles(78.4), 0.1), 48.7);
    assert.equal(Math.round(metresToFeet(1240)), 4068);
  });

  it("converts speed, mass, fluid and work", () => {
    assert.equal(roundTo(kphToMph(16.09344), 0.01), 10);
    assert.equal(roundTo(kgToLb(74), 1), 163);
    assert.equal(roundTo(lbToKg(163), 0.1), 73.9);
    assert.equal(Math.round(mlToFlOz(500)), 17);
    assert.equal(Math.round(kjToKcal(1000)), 239);
  });

  it("formats rider-facing copy without a locale", () => {
    assert.equal(formatTempF(8.4), "47°F");
    assert.equal(formatMph(21), "13 mph");
  });
});
