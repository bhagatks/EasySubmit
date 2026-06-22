import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgPath = resolve(root, "extension/icons/icon.svg");
const outDir = resolve(root, "dist/extension/icons");

/** Rasterize extension/icons/icon.svg into 16/48/128 PNGs for Chrome. */
export async function generateExtensionIcons() {
  mkdirSync(outDir, { recursive: true });

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    throw new Error(
      "sharp is required to build extension icons. Run: npm install --save-dev sharp",
    );
  }

  const svg = readFileSync(svgPath);
  for (const size of [16, 48, 128]) {
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    writeFileSync(resolve(outDir, `icon-${size}.png`), png);
  }
}
