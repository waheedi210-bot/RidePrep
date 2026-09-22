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

  it("drops pressure for a wider inner rim and for tubeless", () => {
    const baseline = calculateTirePressure(road);
    const wideRim = calculateTirePressure({ ...road, rimInnerWidthMm: 25 });
    const tubeless = calculateTirePressure({ ...road, setup: "tubeless" });

    assert.ok(wideRim.rearPsi < baseline.rearPsi);
    assert.ok(tubeless.rearPsi < baseline.rearPsi);
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

  it("drops carbohydrate when GI tolerance is turned down", () => {
    const full = calculateFueling({
      durationHours: 3,
      temperatureC: 15,
      targetWatts: 210,
      giTolerance: 1,
    });
    const sensitive = calculateFueling({
      durationHours: 3,
      temperatureC: 15,
      targetWatts: 210,
      giTolerance: 0,
    });

    assert.equal(sensitive.carbsPerHour, 30);
    assert.ok(full.carbsPerHour > sensitive.carbsPerHour);
  });

  it("adds fluid when dew point is muggy", () => {
    const dry = calculateFueling({
      durationHours: 3,
      temperatureC: 22,
      dewPointC: 8,
      targetWatts: 180,
    });
    const muggy = calculateFueling({
      durationHours: 3,
      temperatureC: 22,
      dewPointC: 22,
      targetWatts: 180,
    });

    assert.ok(muggy.fluidMlPerHour > dry.fluidMlPerHour);
    assert.ok(muggy.sodiumPerHourMg > dry.sodiumPerHourMg);
  });
});
