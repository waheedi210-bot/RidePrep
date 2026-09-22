"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { HourlyConditions } from "@/lib/briefing";
import type { GeoPoint } from "@/lib/geo";
import {
  boundsOf,
  downsampleTrack,
  fitMapView,
  projectPoint,
  TILE_SIZE,
  tileUrl,
  tilesForView,
  windArrowsAlongRoute,
  type WindOnCourse,
} from "@/lib/route-map";
import { bearingToCompass, formatMph } from "@/lib/units";

const ARROW_COLOR: Record<WindOnCourse, string> = {
  headwind: "#fc4c02",
  crosswind: "#fbbf24",
  tailwind: "#4ade80",
};

const DEFAULT_WIDTH = 360;
const MAP_HEIGHT = 224;

function arrowLength(windKph: number): number {
  return Math.min(26, Math.max(14, 10 + windKph * 0.45));
}

export function RouteWindMap({
  points,
  hourly,
  movingHours,
}: {
  points: GeoPoint[];
  hourly: HourlyConditions[];
  movingHours: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const node = frameRef.current;

    if (!node) {
      return;
    }

    const apply = (next: number) => {
      if (next >= 160) {
        setWidth(next);
      }
    };

    apply(node.clientWidth);

    const observer = new ResizeObserver((entries) => {
      apply(entries[0]?.contentRect.width ?? node.clientWidth);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const drawn = useMemo(() => downsampleTrack(points), [points]);
  const bounds = useMemo(() => boundsOf(drawn), [drawn]);
  const view = useMemo(
    () => fitMapView(bounds, width, MAP_HEIGHT),
    [bounds, width],
  );
  const tiles = useMemo(() => tilesForView(view), [view]);
  const path = useMemo(
    () =>
      drawn
        .map((point, index) => {
          const { x, y } = projectPoint(point, view);
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" "),
    [drawn, view],
  );
  const arrows = useMemo(
    () => windArrowsAlongRoute(points, hourly, movingHours),
    [hourly, movingHours, points],
  );
  const start = drawn[0] ? projectPoint(drawn[0], view) : null;
  const finish =
    drawn.length > 1 ? projectPoint(drawn[drawn.length - 1], view) : start;

  if (points.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="route-wind-heading"
      className="rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="route-wind-heading"
          className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-accent"
        >
          Route & wind
        </h2>
        <p className="text-right text-xs text-muted">
          Arrows show where the wind is pushing
        </p>
      </div>

      <div
        ref={frameRef}
        className="relative mt-4 overflow-hidden rounded-xl bg-background"
        style={{ height: MAP_HEIGHT }}
      >
        {tiles.map((tile) => (
          <img
            key={`${tile.z}-${tile.x}-${tile.y}`}
            alt=""
            src={tileUrl(tile)}
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              left: tile.left,
              top: tile.top,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
          />
        ))}

        <svg
          width={view.width}
          height={view.height}
          viewBox={`0 0 ${view.width} ${view.height}`}
          className="absolute inset-0"
          role="img"
          aria-label={
            arrows.length > 0
              ? `Route map with ${arrows.length} wind arrows. First arrow at ${arrows[0].time} is a ${arrows[0].relation} from the ${bearingToCompass(arrows[0].fromDeg)}.`
              : "Route map."
          }
        >
          {path ? (
            <>
              <path
                d={path}
                fill="none"
                stroke="#0f172a"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={path}
                fill="none"
                stroke="#fc4c02"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}

          {start ? (
            <circle
              cx={start.x}
              cy={start.y}
              r="5"
              className="fill-foreground stroke-background"
              strokeWidth="2"
            />
          ) : null}
          {finish && start && (finish.x !== start.x || finish.y !== start.y) ? (
            <rect
              x={finish.x - 4}
              y={finish.y - 4}
              width="8"
              height="8"
              rx="1.5"
              className="fill-accent stroke-background"
              strokeWidth="2"
            />
          ) : null}

          {arrows.map((arrow) => {
            const { x, y } = projectPoint(arrow.point, view);
            const length = arrowLength(arrow.windKph);
            const color = ARROW_COLOR[arrow.relation];

            return (
              <g
                key={`${arrow.time}-${arrow.point.lat}-${arrow.point.lng}`}
                transform={`translate(${x} ${y}) rotate(${arrow.towardsDeg})`}
              >
                <title>
                  {`${arrow.time} · ${formatMph(arrow.windKph)} ${arrow.relation} from the ${bearingToCompass(arrow.fromDeg)}`}
                </title>
                <line
                  x1="0"
                  y1={length * 0.35}
                  x2="0"
                  y2={-length * 0.45}
                  stroke={color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <polygon
                  points={`0,${-length * 0.7} 5,${-length * 0.25} -5,${-length * 0.25}`}
                  fill={color}
                />
              </g>
            );
          })}
        </svg>

        <p className="pointer-events-none absolute bottom-1.5 right-2 font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-muted/80">
          © OSM · CARTO
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          Headwind
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-caution" />
          Crosswind
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-positive" />
          Tailwind
        </li>
      </ul>
    </section>
  );
}
