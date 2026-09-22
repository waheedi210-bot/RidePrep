import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { HourlyConditions } from "./briefing.ts";
import {
  boundsOf,
  downsampleTrack,
  fitMapView,
  latLngToWorld,
  tileUrl,
  tilesForView,
  windArrowsAlongRoute,
  windOnCourse,
} from "./route-map.ts";

function hour(partial: Partial<HourlyConditions> & { time: string }): HourlyConditions {
  return {
    tempC: 18,
    feelsLikeC: 18,
    windKph: 16,
    gustKph: 22,
    windFromDeg: 0,
    precipChance: 0,
    humidityPct: 50,
    dewPointC: 8,
    uvIndex: 4,
    ...partial,
  };
}

describe("latLngToWorld", () => {
  it("puts the equator and prime meridian at the centre of zoom 0", () => {
    const origin = latLngToWorld(0, 0, 0);

    assert.equal(origin.x, 128);
    assert.equal(Number(origin.y.toFixed(4)), 128);
  });

  it("moves north toward the top of the map", () => {
    const equator = latLngToWorld(0, 0, 3);
    const north = latLngToWorld(40, 0, 3);

    assert.ok(north.y < equator.y);
  });
});

describe("downsampleTrack", () => {
  it("keeps short tracks intact and strides long ones", () => {
    const short = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
    ];
    const long = Array.from({ length: 1000 }, (_, index) => ({
      lat: index / 1000,
      lng: index / 1000,
    }));

    assert.equal(downsampleTrack(short).length, 2);
    assert.equal(downsampleTrack(long, 200).length, 200);
    assert.deepEqual(downsampleTrack(long, 200)[0], long[0]);
    assert.deepEqual(downsampleTrack(long, 200)[199], long[999]);
  });
});

describe("windOnCourse", () => {
  it("calls a northbound rider in a north wind a headwind", () => {
    assert.equal(windOnCourse(0, 0), "headwind");
    assert.equal(windOnCourse(0, 180), "tailwind");
    assert.equal(windOnCourse(0, 90), "crosswind");
  });
});

describe("fitMapView", () => {
  it("picks a zoom that keeps the bounds inside the frame", () => {
    const bounds = boundsOf([
      { lat: 39.4, lng: -77.5 },
      { lat: 39.5, lng: -77.3 },
    ]);
    const view = fitMapView(bounds, 360, 224);

    assert.ok(view.zoom >= 8);
    assert.ok(view.zoom <= 14);

    const tiles = tilesForView(view);

    assert.ok(tiles.length > 0);
    assert.ok(tiles.every((tile) => tile.z === view.zoom));
    assert.match(tileUrl(tiles[0]), /^\/api\/map-tile\?z=\d+&x=\d+&y=\d+$/);
  });
});

describe("windArrowsAlongRoute", () => {
  const northbound = [
    { lat: 39.4, lng: -77.4 },
    { lat: 39.5, lng: -77.4 },
    { lat: 39.6, lng: -77.4 },
  ];

  it("places one arrow per hour and reads head/tail from the local heading", () => {
    const arrows = windArrowsAlongRoute(
      northbound,
      [
        hour({ time: "06:00", windFromDeg: 0, windKph: 20 }),
        hour({ time: "07:00", windFromDeg: 180, windKph: 12 }),
      ],
      2,
    );

    assert.equal(arrows.length, 2);
    assert.equal(arrows[0].relation, "headwind");
    assert.equal(arrows[0].towardsDeg, 180);
    assert.equal(arrows[1].relation, "tailwind");
    assert.equal(arrows[1].towardsDeg, 0);
    assert.ok(arrows[1].point.lat > arrows[0].point.lat);
  });

  it("does not stack arrows when the track is only a start pin", () => {
    const arrows = windArrowsAlongRoute(
      [{ lat: 39.4, lng: -77.4 }],
      [
        hour({ time: "06:00", windKph: 8 }),
        hour({ time: "07:00", windKph: 18 }),
      ],
      2,
    );

    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].time, "07:00");
  });
});
