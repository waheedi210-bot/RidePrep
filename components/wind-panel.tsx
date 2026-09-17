import { WindCompass } from "@/components/wind-compass";
import type { WindAdvice, WindRelation } from "@/lib/recommendations";
import { bearingToCompass } from "@/lib/units";

const RELATION_LABELS: Record<WindRelation, string> = {
  headwind: "Headwind",
  crosswind: "Crosswind",
  tailwind: "Tailwind",
};

const RELATION_TONES: Record<WindRelation, string> = {
  headwind: "bg-accent/15 text-accent",
  crosswind: "bg-caution/15 text-caution",
  tailwind: "bg-positive/15 text-positive",
};

function LegChip({
  leg,
  relation,
  bearingDeg,
}: {
  leg: string;
  relation: WindRelation;
  bearingDeg: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-raised/60 px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{leg}</p>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted">
          {bearingToCompass(bearingDeg)} · {Math.round(bearingDeg)}°
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${RELATION_TONES[relation]}`}
      >
        {RELATION_LABELS[relation]}
      </span>
    </div>
  );
}

export function WindPanel({ wind }: { wind: WindAdvice }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Wind from{" "}
        <span className="font-semibold text-foreground">
          {wind.fromLabel} {Math.round(wind.fromDeg)}°
        </span>
        , {wind.averageKph} km/h with gusts to {wind.maxGustKph} km/h.
      </p>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <WindCompass wind={wind} />

        <div className="flex w-full flex-col gap-3">
          <LegChip
            leg="Outbound"
            relation={wind.outboundLeg}
            bearingDeg={wind.outboundBearingDeg}
          />
          <LegChip
            leg="Return"
            relation={wind.returnLeg}
            bearingDeg={wind.returnBearingDeg}
          />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        The orange vector shows where the wind is pushing you; the dashed line
        is the route heading out.
      </p>
    </div>
  );
}
