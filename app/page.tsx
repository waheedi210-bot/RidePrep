import Image from "next/image";

import { InstallPanel } from "@/components/install-panel";

const CHECKLIST = [
  {
    title: "Route brief",
    description:
      "Distance, elevation and surface for the ride, cached so it loads in a tunnel.",
  },
  {
    title: "Kit list",
    description:
      "Layers, spares and tools picked from the forecast at the trailhead.",
  },
  {
    title: "Fuelling plan",
    description: "Carbs per hour and refill stops mapped against your pace.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12 sm:py-16">
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Image
            src="/icons/icon.svg"
            alt=""
            width={56}
            height={56}
            priority
            className="rounded-xl"
          />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Progressive Web App
            </p>
            <h1 className="text-2xl font-semibold sm:text-3xl">RidePrep</h1>
          </div>
        </div>
        <p className="max-w-xl text-base text-muted sm:text-lg">
          Plan, pack and pace your next ride. Install RidePrep to your home
          screen and it opens like a native app — full screen, dark, and usable
          when the signal drops.
        </p>
      </header>

      <InstallPanel />

      <section aria-labelledby="checklist-heading" className="flex flex-col gap-4">
        <h2 id="checklist-heading" className="text-lg font-semibold">
          What you get before every ride
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {CHECKLIST.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-border-subtle bg-surface-raised/60 p-5"
            >
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto border-t border-border-subtle pt-6 text-sm text-muted">
        Placeholder content and placeholder icons — swap{" "}
        <code className="font-mono text-foreground">public/icons</code> and{" "}
        <code className="font-mono text-foreground">public/manifest.json</code>{" "}
        to make it yours.
      </footer>
    </main>
  );
}
