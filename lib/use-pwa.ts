"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type InstallOutcome = "accepted" | "dismissed";

/** Chromium-only, so it is still missing from lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export type DisplayMode = "standalone" | "browser";
export type ServiceWorkerState =
  | "checking"
  | "unsupported"
  | "inactive"
  | "active";

export interface PwaStatus {
  displayMode: DisplayMode;
  serviceWorker: ServiceWorkerState;
  online: boolean;
  /** iOS/iPadOS has no install prompt API — users go through the share sheet. */
  isAppleMobile: boolean;
  canPrompt: boolean;
  lastOutcome: InstallOutcome | null;
  promptInstall: () => Promise<void>;
}

const STANDALONE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: minimal-ui)",
  "(display-mode: fullscreen)",
];

const noop = () => () => {};

function subscribeToDisplayMode(onChange: () => void) {
  const queries = STANDALONE_QUERIES.map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));

  return () => {
    queries.forEach((query) => query.removeEventListener("change", onChange));
  };
}

function getDisplayMode(): DisplayMode {
  const matchesQuery = STANDALONE_QUERIES.some(
    (query) => window.matchMedia(query).matches,
  );
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;

  return matchesQuery || iosStandalone ? "standalone" : "browser";
}

function subscribeToOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);

  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getAppleMobile(): boolean {
  const { userAgent, platform, maxTouchPoints } = window.navigator;

  return (
    /iphone|ipad|ipod/i.test(userAgent) ||
    // iPadOS reports itself as a Mac, but a Mac has no touch points.
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

export function usePwa(): PwaStatus {
  // The browser values are read through useSyncExternalStore so the server
  // render and the hydration pass agree before the client value takes over.
  const displayMode = useSyncExternalStore(
    subscribeToDisplayMode,
    getDisplayMode,
    () => "browser" as const,
  );
  const online = useSyncExternalStore(
    subscribeToOnline,
    () => window.navigator.onLine,
    () => true,
  );
  const isAppleMobile = useSyncExternalStore(noop, getAppleMobile, () => false);
  const serviceWorkerSupported = useSyncExternalStore(
    noop,
    () => "serviceWorker" in window.navigator,
    () => false,
  );

  const [registration, setRegistration] =
    useState<Exclude<ServiceWorkerState, "unsupported">>("checking");
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [lastOutcome, setLastOutcome] = useState<InstallOutcome | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      // Chromium shows its own mini-infobar unless the event is cancelled.
      event.preventDefault();
      setInstallEvent(event);
    };

    const onInstalled = () => {
      setInstallEvent(null);
      setLastOutcome("accepted");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!serviceWorkerSupported) {
      return;
    }

    let cancelled = false;
    const container = window.navigator.serviceWorker;

    const syncRegistration = () => {
      void container.getRegistration().then((current) => {
        if (!cancelled) {
          setRegistration(current?.active ? "active" : "inactive");
        }
      });
    };

    syncRegistration();
    container.addEventListener("controllerchange", syncRegistration);

    return () => {
      cancelled = true;
      container.removeEventListener("controllerchange", syncRegistration);
    };
  }, [serviceWorkerSupported]);

  const promptInstall = useCallback(async () => {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;

    setLastOutcome(outcome);
    // The event can only be used once; Chromium re-fires it when eligible.
    setInstallEvent(null);
  }, [installEvent]);

  return {
    displayMode,
    serviceWorker: serviceWorkerSupported ? registration : "unsupported",
    online,
    isAppleMobile,
    canPrompt: installEvent !== null,
    lastOutcome,
    promptInstall,
  };
}
