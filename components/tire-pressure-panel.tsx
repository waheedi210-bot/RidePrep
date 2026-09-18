import { Metric } from "@/components/metric";
import { NumberField } from "@/components/number-field";
import type { TirePressureResult, TireSetup } from "@/lib/calculations";
import { formatNumber, psiToBar } from "@/lib/units";

export function TirePressurePanel({
  riderWeightKg,
  bikeWeightKg,
  tireWidthMm,
  rimInnerWidthMm,
  setup,
  isGravel,
  onRiderWeightKg,
  onBikeWeightKg,
  onTireWidthMm,
  onRimInnerWidthMm,
  onSetup,
  onIsGravel,
  pressure,
  wetHint,
}: {
  riderWeightKg: number;
  bikeWeightKg: number;
  tireWidthMm: number;
  rimInnerWidthMm: number;
  setup: TireSetup;
  isGravel: boolean;
  onRiderWeightKg: (value: number) => void;
  onBikeWeightKg: (value: number) => void;
  onTireWidthMm: (value: number) => void;
  onRimInnerWidthMm: (value: number) => void;
  onSetup: (value: TireSetup) => void;
  onIsGravel: (value: boolean) => void;
  pressure: TirePressureResult;
  wetHint: string | null;
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
        <NumberField
          label="Rim inner"
          value={rimInnerWidthMm}
          onChange={onRimInnerWidthMm}
          unit="mm"
          min={15}
          max={35}
          step={0.5}
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Setup
          </legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border-subtle bg-background p-1">
            {(
              [
                ["tubeless", "Tubeless"],
                ["clincher", "Tube"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={setup === value}
                onClick={() => onSetup(value)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  setup === value
                    ? "bg-accent text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
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
          {setup} tyres with a {formatNumber(rimInnerWidthMm, 1)} mm inner rim.
        </p>

        {wetHint ? (
          <p className="mt-3 rounded-xl border border-caution/25 bg-caution/10 px-4 py-3 text-xs leading-relaxed text-caution">
            {wetHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
