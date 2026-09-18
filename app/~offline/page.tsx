import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  description: "RidePrep could not reach the network.",
};

export default function Offline() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        Offline
      </p>
      <h1 className="text-2xl font-semibold">No signal out here</h1>
      <p className="text-sm text-muted">
        This page has not been cached yet. Pages you have already visited stay
        available, and everything reloads as soon as you are back in range.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-xl border border-border-subtle px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface-raised"
      >
        Back to the ride brief
      </Link>
    </main>
  );
}
