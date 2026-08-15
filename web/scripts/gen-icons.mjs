import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const dumbbellPath =
  "M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" +
  "M2.5 21.5l1.4-1.4M20.1 3.9l1.4-1.4" +
  "M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" +
  "M9.6 14.4l4.8-4.8";

// Fondo cuadrado redondeado con degradado (mismo tono que la marca en
// el sidebar del entrenador: indigo -> violeta), ícono de mancuerna
// centrado en blanco. `maskable` deja más "zona segura" alrededor
// porque el sistema operativo recorta el ícono a su propia forma.
function buildSvg({ size, maskable }) {
  const rx = maskable ? 0 : size * 0.22;
  const iconScale = maskable ? 0.42 : 0.58;
  const iconSize = size * iconScale;
  const offset = (size - iconSize) / 2;
  const strokeWidth = (2 / 24) * iconSize;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bg)" />
  <g transform="translate(${offset} ${offset})">
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white"
         stroke-width="${strokeWidth * (24 / iconSize)}" stroke-linecap="round" stroke-linejoin="round">
      <path d="${dumbbellPath}" />
    </svg>
  </g>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: false },
];

for (const t of targets) {
  const svg = buildSvg(t);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, t.file));
  console.log("wrote", t.file);
}
