import type { WindAdvice } from "@/lib/recommendations";
import { bearingToCompass } from "@/lib/units";

const CARDINALS = [
  { label: "N", x: 100, y: 17 },
  { label: "E", x: 183, y: 100 },
  { label: "S", x: 100, y: 183 },
  { label: "W", x: 17, y: 100 },
];

const TICK_BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315];

export function WindCompass({ wind }: { wind: WindAdvice }) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Wind from the ${wind.fromLabel}, ${Math.round(wind.fromDeg)} degrees, at ${wind.averageKph} kilometres per hour. The route heads out on a bearing of ${wind.outboundBearingDeg} degrees, giving a ${wind.outboundLeg} on the way out.`}
      className="h-40 w-40 shrink-0"
    >
      <circle
        cx="100"
        cy="100"
        r="72"
        className="fill-background stroke-border-subtle"
        strokeWidth="1.5"
      />
      <circle
        cx="100"
        cy="100"
        r="46"
        className="fill-none stroke-border-subtle"
        strokeWidth="1"
        strokeDasharray="3 5"
      />

      {TICK_BEARINGS.map((bearing) => (
        <line
          key={bearing}
          x1="100"
          y1="28"
          x2="100"
          y2="36"
          transform={`rotate(${bearing} 100 100)`}
          className="stroke-border-subtle"
          strokeWidth="2"
        />
      ))}

      {CARDINALS.map(({ label, x, y }) => (
        <text
          key={label}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fill="currentColor"
          className="font-mono text-muted"
        >
          {label}
        </text>
      ))}

      {/* The out-and-back axis of the route, for reading the wind against. */}
      <g transform={`rotate(${wind.outboundBearingDeg} 100 100)`}>
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="34"
          className="stroke-muted"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <circle cx="100" cy="34" r="3" className="fill-muted" />
      </g>

      {/* Wind vector: points the way the wind blows, not where it comes from. */}
      <g transform={`rotate(${wind.towardsDeg} 100 100)`}>
        <line
          x1="100"
          y1="142"
          x2="100"
          y2="70"
          className="stroke-accent"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <polygon points="100,48 113,74 87,74" className="fill-accent" />
      </g>

      <circle cx="100" cy="100" r="3.5" className="fill-foreground" />
      <title>{`Wind from ${wind.fromLabel} towards ${bearingToCompass(wind.towardsDeg)}`}</title>
    </svg>
  );
}
