import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FRONT_LOAD_FRACTION,
  REAR_LOAD_FRACTION,
  calculateFueling,
  calculateTirePressure,
} from "./calculations.ts";

describe("calculateTirePressure", () => {
  const road = {
    riderWeightKg: 70,
    bikeWeightKg: 8,
    tireWidthMm: 28,
    isGravel: false,
  };

  it("puts 60 % of load on the rear, so rear pressure is higher than front", () => {
    assert.equal(REAR_LOAD_FRACTION, 0.6);
    assert.equal(FRONT_LOAD_FRACTION, 0.4);

    const { frontPsi, rearPsi } = calculateTirePressure(road);

    assert.ok(rearPsi > frontPsi);
  });

  it("matches the Silca 28 mm road calibration near 62 / 73 psi", () => {
    const { frontPsi, rearPsi } = calculateTirePressure(road);

    assert.equal(frontPsi, 49);
    assert.equal(rearPsi, 73);
  });

  it("drops pressure on wider casings and again on gravel", () => {
    const road32 = calculateTirePressure({ ...road, tireWidthMm: 32 });
    const gravel32 = calculateTirePressure({
      ...road,
      tireWidthMm: 32,
      isGravel: true,
    });

    assert.ok(road32.rearPsi < 73);
    assert.ok(gravel32.rearPsi < road32.rearPsi);
  });
});

describe("calculateFueling", () => {
  it("sits at 30 g/hr at easy endurance watts", () => {
    const { carbsPerHour } = calculateFueling({
      durationHours: 2,
      temperatureC: 15,
      targetWatts: 120,
    });

    assert.equal(carbsPerHour, 30);
  });

  it("sits at 90 g/hr at threshold watts", () => {
    const { carbsPerHour } = calculateFueling({
      durationHours: 2,
      temperatureC: 15,
      targetWatts: 300,
    });

    assert.equal(carbsPerHour, 90);
  });

  it("scales fluid up with temperature and with watts", () => {
    const coolEasy = calculateFueling({
      durationHours: 2,
      temperatureC: 10,
      targetWatts: 150,
    });
    const hotHard = calculateFueling({
      durationHours: 2,
      temperatureC: 28,
      targetWatts: 250,
    });

    assert.ok(hotHard.fluidMlPerHour > coolEasy.fluidMlPerHour);
    assert.ok(hotHard.carbsPerHour > coolEasy.carbsPerHour);
  });
});
