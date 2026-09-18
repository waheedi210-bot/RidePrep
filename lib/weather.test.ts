import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { apparentWindChillC, windChillC } from "./wind-chill.ts";
import {
  observe,
  parseOpenMeteoTime,
  parseWeatherQuery,
  sliceHourlyFromStart,
  type OpenMeteoHourly,
} from "./weather.ts";

describe("parseWeatherQuery", () => {
  it("requires lat and lng and reports both when missing", () => {
    const result = parseWeatherQuery(new URLSearchParams());

    assert.ok("issues" in result);
    assert.deepEqual(
      result.issues.map((issue) => issue.param).sort(),
      ["lat", "lng"],
    );
  });

  it("rejects out-of-range coordinates", () => {
    const result = parseWeatherQuery(
      new URLSearchParams({ lat: "91", lng: "-200" }),
    );

    assert.ok("issues" in result);
    assert.equal(result.issues.length, 2);
  });

  it("treats a timezone-naive startTime as UTC", () => {
    const result = parseWeatherQuery(
      new URLSearchParams({
        lat: "53.35",
        lng: "-1.82",
        startTime: "2026-09-17T06:30:00",
      }),
    );

    assert.ok("query" in result);
    assert.equal(result.query.startTime?.toISOString(), "2026-09-17T06:30:00.000Z");
  });

  it("rejects a malformed startTime", () => {
    const result = parseWeatherQuery(
      new URLSearchParams({
        lat: "53.35",
        lng: "-1.82",
        startTime: "tomorrow-morning",
      }),
    );

    assert.ok("issues" in result);
    assert.equal(result.issues[0]?.param, "startTime");
  });
});

describe("windChillC", () => {
  it("matches the NWS metric formula at 0 °C and 20 km/h", () => {
    // 20^0.16 ≈ 1.615394, so T_wc ≈ 13.12 - 11.37*1.615394 = -5.247
    assert.equal(windChillC(0, 20).toFixed(1), "-5.2");
  });

  it("returns air temperature when it is too warm for the formula", () => {
    assert.equal(windChillC(15, 40), 15);
  });

  it("returns air temperature when the wind is below 4.8 km/h", () => {
    assert.equal(windChillC(-5, 3), -5);
  });

  it("picks the colder of wind-chill and apparent temperature", () => {
    assert.equal(apparentWindChillC(0, 20, -1).toFixed(1), "-5.2");
    assert.equal(apparentWindChillC(0, 20, -8), -8);
  });
});

describe("sliceHourlyFromStart", () => {
  const hourly: OpenMeteoHourly = {
    time: [
      "2026-09-17T05:00",
      "2026-09-17T06:00",
      "2026-09-17T07:00",
      "2026-09-17T08:00",
      "2026-09-17T09:00",
    ],
    temperature_2m: [8, 9, 11, 13, 16],
    relative_humidity_2m: [90, 88, 80, 72, 65],
    apparent_temperature: [5, 6, 8, 11, 14],
    wind_speed_10m: [22, 24, 26, 25, 21],
    wind_direction_10m: [296, 300, 305, 310, 314],
    uv_index: [0, 0.2, 1.4, 2.8, 4.1],
  };

  it("includes the hour that contains a mid-hour startTime", () => {
    const result = sliceHourlyFromStart(
      hourly,
      new Date("2026-09-17T06:30:00Z"),
      4,
    );

    assert.ok("hours" in result);
    assert.deepEqual(
      result.hours.map((hour) => hour.time),
      [
        "2026-09-17T06:00:00.000Z",
        "2026-09-17T07:00:00.000Z",
        "2026-09-17T08:00:00.000Z",
        "2026-09-17T09:00:00.000Z",
      ],
    );
  });

  it("errors when startTime is after the last hourly slot", () => {
    const result = sliceHourlyFromStart(
      hourly,
      new Date("2026-09-18T00:00:00Z"),
      4,
    );

    assert.ok("error" in result);
  });
});

describe("parseOpenMeteoTime", () => {
  it("treats naive stamps as UTC by default", () => {
    assert.equal(
      parseOpenMeteoTime("2026-09-19T06:00").toISOString(),
      "2026-09-19T06:00:00.000Z",
    );
  });

  it("interprets naive stamps in the forecast's named zone", () => {
    assert.equal(
      parseOpenMeteoTime("2026-09-19T06:00", "America/New_York").toISOString(),
      "2026-09-19T10:00:00.000Z",
    );
  });
});

describe("observe", () => {
  it("reports a positive wind-chill delta when the wind takes heat off", () => {
    const observation = observe({
      time: "2026-09-17T06:00",
      temperatureC: 8.4,
      humidityPct: 90,
      apparentTemperatureC: 5.2,
      windSpeedKph: 21,
      windDirectionDeg: 296,
      uvIndex: 0,
    });

    assert.equal(observation.windChillApplicable, true);
    assert.ok(observation.apparentWindChillC < observation.temperatureC);
    assert.equal(
      observation.windChillDeltaC,
      Number(
        (
          observation.temperatureC - observation.apparentWindChillC
        ).toFixed(1),
      ),
    );
  });
});
