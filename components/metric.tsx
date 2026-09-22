const TONES = {
  accent: "text-accent",
  plain: "text-foreground",
  positive: "text-positive",
  caution: "text-caution",
} as const;

export interface MetricProps {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  tone?: keyof typeof TONES;
}

export function Metric({
  label,
  value,
  unit,
  detail,
  tone = "plain",
}: MetricProps) {
  return (
    <div>
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${TONES[tone]}`}>
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-medium text-muted">{unit}</span>
        ) : null}
      </p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
