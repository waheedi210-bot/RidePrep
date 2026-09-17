"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export interface BriefingTab {
  id: string;
  label: string;
  /** Used below the `sm` breakpoint, where the full label may not fit. */
  shortLabel: string;
  panel: ReactNode;
}

export function BriefingTabs({ tabs }: { tabs: BriefingTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  const baseId = useId();

  const tabElementId = (id: string) => `${baseId}-tab-${id}`;
  const panelElementId = (id: string) => `${baseId}-panel-${id}`;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    const current = tabs.findIndex((tab) => tab.id === activeId);

    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key in offsets
            ? (current + offsets[event.key] + tabs.length) % tabs.length
            : null;

    if (next === null) {
      return;
    }

    event.preventDefault();
    setActiveId(tabs[next].id);
    document.getElementById(tabElementId(tabs[next].id))?.focus();
  };

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface">
      <div
        role="tablist"
        aria-label="Briefing sections"
        onKeyDown={onKeyDown}
        className="grid border-b border-border-subtle"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabElementId(tab.id)}
              aria-controls={panelElementId(tab.id)}
              aria-selected={isActive}
              aria-label={tab.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className={`-mb-px border-b-2 px-1 py-3.5 text-center text-[0.6875rem] font-semibold leading-tight transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-2 sm:text-sm ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={panelElementId(tab.id)}
          aria-labelledby={tabElementId(tab.id)}
          hidden={tab.id !== activeId}
          tabIndex={0}
          className="p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:p-6"
        >
          {tab.panel}
        </div>
      ))}
    </section>
  );
}
