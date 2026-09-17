import { Metric } from "@/components/metric";
import { WindCompass } from "@/components/wind-compass";
import type { RiderProfile, RouteSummary } from "@/lib/briefing";
import { SURFACE_LABELS } from "@/lib/briefing";
import type { TyreAdvice, WindAdvice, WindRelation } from "@/lib/recommendations";
import { bearingToCompass, formatNumber } from "@/lib/units";

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

export function TyreWindPanel({
  tyres,
  wind,
  rider,
  route,
}: {
  tyres: TyreAdvice;
  wind: WindAdvice;
  rider: RiderProfile;
  route: RouteSummary;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="Front"
            value={formatNumber(tyres.frontPsi)}
            unit="psi"
            detail={`${formatNumber(tyres.frontBar, 1)} bar`}
            tone="accent"
          />
          <Metric
            label="Rear"
            value={formatNumber(tyres.rearPsi)}
            unit="psi"
            detail={`${formatNumber(tyres.rearBar, 1)} bar`}
            tone="accent"
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Equal tyre drop for {formatNumber(tyres.systemWeightKg, 1)} kg of
          rider and bike on {rider.tyreWidthMm} mm{" "}
          {SURFACE_LABELS[route.surface].toLowerCase()} tyres.
        </p>

        {tyres.wetHint ? (
          <p className="mt-3 rounded-xl border border-caution/25 bg-caution/10 px-4 py-3 text-xs leading-relaxed text-caution">
            {tyres.wetHint}
          </p>
        ) : null}
      </div>

      <div className="border-t border-border-subtle pt-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <WindCompass wind={wind} />

          <div className="flex w-full flex-col gap-3">
            <div>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                Wind from
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {wind.fromLabel} {Math.round(wind.fromDeg)}°
                <span className="ml-2 text-sm font-medium text-muted">
                  {wind.averageKph} km/h, gusts {wind.maxGustKph}
                </span>
              </p>
            </div>

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

        <p className="mt-4 text-xs leading-relaxed text-muted">
          The orange vector shows where the wind is pushing you; the dashed line
          is the route heading out.
        </p>
      </div>
    </div>
  );
}
