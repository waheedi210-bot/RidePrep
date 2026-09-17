export const SHARE_TOAST = "Briefing copied to clipboard!";

export type ShareOutcome = "shared" | "copied" | "cancelled";

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
