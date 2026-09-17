export function NumberField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span className="flex items-center gap-2 rounded-xl border border-border-subtle bg-background px-3 py-2 focus-within:border-accent">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => {
            const next = event.target.valueAsNumber;

            if (Number.isFinite(next)) {
              onChange(next);
            }
          }}
          className="w-full bg-transparent text-sm font-semibold tabular-nums outline-none"
        />
        <span className="text-xs text-muted">{unit}</span>
      </span>
    </label>
  );
}
