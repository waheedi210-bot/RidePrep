import type { ApparelAdvice } from "@/lib/recommendations";

export function ApparelPanel({ advice }: { advice: ApparelAdvice }) {
  return (
    <div>
      <p className="text-sm text-muted">
        Built for{" "}
        <span className="font-semibold text-foreground">
          {advice.startFeelsLikeC}° feels-like
        </span>{" "}
        at the start and {advice.maxWindKph} km/h of wind, warming to{" "}
        {advice.peakFeelsLikeC}°.
      </p>

      <ul className="mt-5 flex flex-col gap-3">
        {advice.picks.map((pick) => (
          <li
            key={pick.slot}
            className="rounded-xl border border-border-subtle bg-surface-raised/60 p-4"
          >
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-accent">
              {pick.slot}
            </p>
            <p className="mt-1.5 text-base font-semibold leading-snug">
              {pick.item}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              {pick.reason}
            </p>
          </li>
        ))}
      </ul>

      {advice.shedAtTime ? (
        <p className="mt-5 rounded-xl border border-caution/25 bg-caution/10 px-4 py-3 text-xs leading-relaxed text-caution">
          Feels-like passes 14° around {advice.shedAtTime} — plan a stop to stow
          the vest, or you will overheat on the last climb.
        </p>
      ) : null}

      {advice.sunscreenHint ? (
        <p className="mt-3 rounded-xl border border-caution/25 bg-caution/10 px-4 py-3 text-xs leading-relaxed text-caution">
          {advice.sunscreenHint}
        </p>
      ) : null}
    </div>
  );
}
