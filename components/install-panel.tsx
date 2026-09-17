"use client";

import { usePwa } from "@/lib/use-pwa";

const STATUS_TONES = {
  good: "bg-lime/15 text-lime",
  info: "bg-accent/15 text-accent",
  idle: "bg-white/10 text-muted",
} as const;

type StatusTone = keyof typeof STATUS_TONES;

function Chip({ tone, children }: { tone: StatusTone; children: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-xs tracking-tight ${STATUS_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

function StatusRow({
  label,
  tone,
  value,
}: {
  label: string;
  tone: StatusTone;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border-subtle py-3 first:border-t-0 first:pt-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd>
        <Chip tone={tone}>{value}</Chip>
      </dd>
    </div>
  );
}

export function InstallPanel() {
  const {
    displayMode,
    serviceWorker,
    online,
    isAppleMobile,
    canPrompt,
    lastOutcome,
    promptInstall,
  } = usePwa();

  const installed = displayMode === "standalone";

  return (
    <section
      aria-labelledby="install-heading"
      className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-lg shadow-black/20 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="install-heading" className="text-lg font-semibold">
          Install to your home screen
        </h2>
        <Chip tone={installed ? "good" : canPrompt ? "info" : "idle"}>
          {installed
            ? "Installed"
            : canPrompt
              ? "Ready to install"
              : "In browser"}
        </Chip>
      </div>

      <dl className="mt-6">
        <StatusRow
          label="Display mode"
          tone={installed ? "good" : "idle"}
          value={displayMode}
        />
        <StatusRow
          label="Service worker"
          tone={serviceWorker === "active" ? "good" : "idle"}
          value={serviceWorker}
        />
        <StatusRow
          label="Network"
          tone={online ? "good" : "info"}
          value={online ? "online" : "offline"}
        />
      </dl>

      <div className="mt-6">
        {installed ? (
          <p className="text-sm text-muted">
            RidePrep is running standalone — no browser chrome, and the last
            visited pages stay available offline.
          </p>
        ) : canPrompt ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
          >
            Add to Home Screen
          </button>
        ) : isAppleMobile ? (
          <ol className="space-y-2 text-sm text-muted">
            <li>
              1. Tap the <span className="text-foreground">Share</span> button in
              Safari.
            </li>
            <li>
              2. Choose{" "}
              <span className="text-foreground">Add to Home Screen</span>.
            </li>
            <li>
              3. Confirm — RidePrep launches without browser chrome.
            </li>
          </ol>
        ) : (
          <p className="text-sm text-muted">
            Your browser has not offered an install prompt yet. It needs a
            production build (<code className="font-mono text-foreground">npm run build &amp;&amp; npm start</code>)
            served over HTTPS or localhost, with the service worker active.
          </p>
        )}

        {lastOutcome === "dismissed" ? (
          <p className="mt-4 text-sm text-muted">
            Install dismissed. You can still install from your browser menu.
          </p>
        ) : null}
      </div>
    </section>
  );
}
