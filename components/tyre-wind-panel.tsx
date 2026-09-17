import { Metric } from "@/components/metric";
import { NumberField } from "@/components/number-field";
import { WindCompass } from "@/components/wind-compass";
import type { TirePressureResult } from "@/lib/calculations";
import type { WindAdvice, WindRelation } from "@/lib/recommendations";
import { bearingToCompass, formatNumber, psiToBar } from "@/lib/units";

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
  riderWeightKg,
  bikeWeightKg,
  tireWidthMm,
  isGravel,
  onRiderWeightKg,
  onBikeWeightKg,
  onTireWidthMm,
  onIsGravel,
  pressure,
  wetHint,
  wind,
}: {
  riderWeightKg: number;
  bikeWeightKg: number;
  tireWidthMm: number;
  isGravel: boolean;
  onRiderWeightKg: (value: number) => void;
  onBikeWeightKg: (value: number) => void;
  onTireWidthMm: (value: number) => void;
  onIsGravel: (value: boolean) => void;
  pressure: TirePressureResult;
  wetHint: string | null;
  wind: WindAdvice;
}) {
  const systemKg = riderWeightKg + bikeWeightKg;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Rider"
          value={riderWeightKg}
          onChange={onRiderWeightKg}
          unit="kg"
          min={40}
          max={140}
          step={0.5}
        />
        <NumberField
          label="Bike"
          value={bikeWeightKg}
          onChange={onBikeWeightKg}
          unit="kg"
          min={5}
          max={20}
          step={0.1}
        />
        <NumberField
          label="Tire width"
          value={tireWidthMm}
          onChange={onTireWidthMm}
          unit="mm"
          min={23}
          max={64}
          step={1}
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Surface
          </legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border-subtle bg-background p-1">
            {(
              [
                [false, "Road"],
                [true, "Gravel"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={isGravel === value}
                onClick={() => onIsGravel(value)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isGravel === value
                    ? "bg-accent text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="Front"
            value={formatNumber(pressure.frontPsi)}
            unit="psi"
            detail={`${formatNumber(psiToBar(pressure.frontPsi), 1)} bar · 40% load`}
            tone="accent"
          />
          <Metric
            label="Rear"
            value={formatNumber(pressure.rearPsi)}
            unit="psi"
            detail={`${formatNumber(psiToBar(pressure.rearPsi), 1)} bar · 60% load`}
            tone="accent"
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Silca / SRAM equal-drop model for {formatNumber(systemKg, 1)} kg of
          rider and bike on {tireWidthMm} mm {isGravel ? "gravel" : "road"}{" "}
          tyres.
        </p>

        {wetHint ? (
          <p className="mt-3 rounded-xl border border-caution/25 bg-caution/10 px-4 py-3 text-xs leading-relaxed text-caution">
            {wetHint}
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
