import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseGpx } from "./gpx.ts";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RidePrep">
  <metadata><name>Winnats Pass Loop</name></metadata>
  <trk>
    <name>Ignored track name</name>
    <trkseg>
      <trkpt lat="53.3278" lon="-1.7597"><ele>318</ele></trkpt>
      <trkpt lat="53.3350" lon="-1.7800"><ele>410</ele></trkpt>
      <trkpt lat="53.3480" lon="-1.8100"><ele>380</ele></trkpt>
      <trkpt lat="53.3600" lon="-1.8400"><ele>290</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("parseGpx", () => {
  it("reads name, distance, climb and start coordinates", () => {
    const route = parseGpx(SAMPLE);

    assert.equal(route.name, "Winnats Pass Loop");
    assert.equal(route.lat, 53.3278);
    assert.equal(route.lng, -1.7597);
    assert.ok(route.distanceKm > 5);
    assert.ok(route.elevationGainM >= 90);
    assert.ok(route.movingHours >= 0.5);
    assert.ok(route.outboundBearingDeg >= 0);
    assert.ok(route.outboundBearingDeg < 360);
  });

  it("rejects a file with no track points", () => {
    assert.throws(() => parseGpx("<gpx></gpx>"), /usable track/);
  });

  it("uses the track, not cue waypoints, for distance and the start", () => {
    const mixed = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="http://ridewithgps.com/">
  <metadata><name>Gran Route</name></metadata>
  <wpt lat="39.48" lon="-77.46"><name>Aid Station</name></wpt>
  <wpt lat="39.70" lon="-77.35"><name>Climb</name></wpt>
  <trk>
    <trkseg>
      <trkpt lat="39.41617" lon="-77.4193"><ele>89.1</ele></trkpt>
      <trkpt lat="39.41622" lon="-77.42009"><ele>89.2</ele></trkpt>
      <trkpt lat="39.41700" lon="-77.42200"><ele>95.0</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;
    const route = parseGpx(mixed);

    assert.equal(route.name, "Gran Route");
    assert.equal(route.lat, 39.41617);
    assert.equal(route.lng, -77.4193);
    assert.equal(route.points.length, 3);
    assert.ok(route.distanceKm < 1);
  });
});
