export const SHARE_TOAST = "Briefing copied to clipboard!";

export type ShareOutcome = "shared" | "copied" | "cancelled";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Stable share-card date, e.g. `Wed, Sep 23`. */
export function formatShareDate(dateYmd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim());

  if (!match) {
    return dateYmd;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

  return `${weekday}, ${MONTHS[month - 1]} ${day}`;
}

/** 12-hour roll-out clock for the share card, e.g. `6:30 AM`. */
export function formatShareTime(timeHm: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(timeHm.trim());

  if (!match) {
    return timeHm;
  }

  const hour24 = Number(match[1]);
  const minutes = match[2];
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${hour12}:${minutes} ${suffix}`;
}

export function dataUrlToPngBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",", 2);
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

export function canShareFiles(file: File): boolean {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

async function copyPngOrUrl(blob: Blob, url: string): Promise<void> {
  if (typeof ClipboardItem === "function" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      return;
    } catch {
      // Fall through to a URL copy — Firefox and some desktop Chromium
      // builds refuse image/png on the clipboard without a user gesture
      // that the browser classifies as a paste-source.
    }
  }

  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available.");
  }

  await navigator.clipboard.writeText(url);
}

export async function shareOrCopyPng(
  blob: Blob,
  {
    fileName,
    title,
    text,
    url,
  }: {
    fileName: string;
    title: string;
    text: string;
    url: string;
  },
): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: blob.type });

  if (canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title, text });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  await copyPngOrUrl(blob, url);
  return "copied";
}
