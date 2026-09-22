import type { HourlyConditions } from "@/lib/briefing";
import {
  niceWindMaxMph,
  seriesPath,
  windChartPoints,
  xLabelIndexes,
  yTicks,
} from "@/lib/wind-chart";
import { formatNumber } from "@/lib/units";

const SPEED_COLOR = "#4f8fd6";
const GUST_COLOR = "#e39b2d";
const WIDTH = 360;
const HEIGHT = 220;
const LEFT = 36;
const RIGHT = 36;
const TOP = 16;
const BOTTOM = 36;

export function WindChart({ hourly }: { hourly: HourlyConditions[] }) {
  const points = windChartPoints(hourly);

  if (points.length === 0) {
    return null;
  }

  const maxMph = niceWindMaxMph(Math.max(...points.map((point) => point.gustMph)));
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const speedPath = seriesPath(
    points.map((point) => point.speedMph),
    maxMph,
    LEFT,
    TOP,
    plotWidth,
    plotHeight,
  );
  const gustPath = seriesPath(
    points.map((point) => point.gustMph),
    maxMph,
    LEFT,
    TOP,
    plotWidth,
    plotHeight,
  );
  const ticks = yTicks(maxMph);
  const labels = xLabelIndexes(points.length);

  const pointAt = (value: number, index: number) => {
    const x =
      points.length === 1
        ? LEFT + plotWidth / 2
        : LEFT + (index / (points.length - 1)) * plotWidth;
    const y = TOP + plotHeight - (Math.min(value, maxMph) / maxMph) * plotHeight;

    return { x, y };
  };

  return (
    <section
      aria-labelledby="wind-chart-heading"
      className="rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6"
    >
      <h2
        id="wind-chart-heading"
        className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-accent"
      >
        Wind
      </h2>

      <div className="mt-4 overflow-hidden rounded-xl bg-[#f7f4ee] px-2 pb-3 pt-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Wind speed and gusts in miles per hour from ${points[0].label} to ${points[points.length - 1].label}.`}
        >
          {ticks.map((tick) => {
            const y = TOP + plotHeight - (tick / maxMph) * plotHeight;

            return (
              <g key={tick}>
                <line
                  x1={LEFT}
                  x2={LEFT + plotWidth}
                  y1={y}
                  y2={y}
                  stroke="#d4d0c8"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? undefined : "2 4"}
                />
                <text
                  x={LEFT - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {tick}
                </text>
                <text
                  x={LEFT + plotWidth + 8}
                  y={y + 3}
                  textAnchor="start"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {labels.map((index) => {
            const { x } = pointAt(0, index);

            return (
              <text
                key={points[index].time}
                x={x}
                y={HEIGHT - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {points[index].label}
              </text>
            );
          })}

          <path
            d={gustPath}
            fill="none"
            stroke={GUST_COLOR}
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={speedPath}
            fill="none"
            stroke={SPEED_COLOR}
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((point, index) => {
            const gust = pointAt(point.gustMph, index);
            const speed = pointAt(point.speedMph, index);

            return (
              <g key={point.time}>
                <title>
                  {`${point.label}: ${formatNumber(point.speedMph)} mph, gusts ${formatNumber(point.gustMph)} mph`}
                </title>
                <circle cx={gust.x} cy={gust.y} r="3" fill={GUST_COLOR} />
                <circle cx={speed.x} cy={speed.y} r="3" fill={SPEED_COLOR} />
              </g>
            );
          })}
        </svg>

        <ul className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-600">
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: SPEED_COLOR }}
            />
            Wind speed (mph)
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: GUST_COLOR }}
            />
            Gusts (mph)
          </li>
        </ul>
      </div>
    </section>
  );
}
