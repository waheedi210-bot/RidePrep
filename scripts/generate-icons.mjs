/**
 * Renders the PNG app icons in public/icons, plus app/favicon.ico, from the
 * SVG sources in public/icons.
 *
 * The committed artwork is a placeholder. To rebrand, edit icon.svg and
 * icon-maskable.svg (or drop in your own files) and run `npm run icons`.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

const pngTargets = [
  { source: "icon.svg", size: 96, output: "icon-96.png" },
  { source: "icon.svg", size: 192, output: "icon-192.png" },
  { source: "icon.svg", size: 384, output: "icon-384.png" },
  { source: "icon.svg", size: 512, output: "icon-512.png" },
  { source: "icon-maskable.svg", size: 192, output: "icon-maskable-192.png" },
  { source: "icon-maskable.svg", size: 512, output: "icon-maskable-512.png" },
  // iOS crops its own corners and flattens transparency, so this one is
  // rendered from the full-bleed source rather than the maskable one.
  { source: "icon.svg", size: 180, output: "apple-touch-icon.png" },
];

const faviconSizes = [16, 32, 48];

const sources = new Map();

async function render(source, size) {
  if (!sources.has(source)) {
    sources.set(source, await readFile(join(iconsDir, source)));
  }

  return sharp(sources.get(source), { density: 384 })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Minimal ICO container holding PNG payloads (supported since Windows Vista). */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = header.length + images.length * 16;

  const directory = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width, 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;

    return entry;
  });

  return Buffer.concat([
    header,
    ...directory,
    ...images.map(({ data }) => data),
  ]);
}

for (const { source, size, output } of pngTargets) {
  await writeFile(join(iconsDir, output), await render(source, size));
  console.log(`${source} -> public/icons/${output} (${size}x${size})`);
}

const faviconImages = await Promise.all(
  faviconSizes.map(async (size) => ({
    size,
    data: await render("icon.svg", size),
  })),
);

await writeFile(join(root, "app", "favicon.ico"), packIco(faviconImages));
console.log(`icon.svg -> app/favicon.ico (${faviconSizes.join(", ")})`);
