/* eslint-disable @typescript-eslint/no-require-imports -- script CommonJS standalone (no forma parte del build de Next) */
const sharp = require("sharp");
const path = require("path");

const ICON_BLACK = path.resolve(__dirname, "../../app/assets/logos/Aretia Logo Black.png");
const ICON_WHITE = path.resolve(__dirname, "../../app/assets/logos/Aretia Logo White.png");
const PHONE_ICON = path.resolve(__dirname, "../../app/assets/logos/Aretia Phone Icon mobile app.png");

async function main() {
  // Favicon (pestaña del navegador): el ícono BLANCO, sin fondo — tal
  // como se pidió, aunque sobre un tab claro casi no se note; ya trae
  // transparencia real.
  await sharp(ICON_WHITE).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve(__dirname, "../src/app/icon.png"));
  console.log("icon.png (favicon, blanco) saved");

  // Ícono de la app (PWA / instalable / apple-touch): el archivo
  // "Aretia Phone Icon mobile app.png" tal cual viene — ya es el ícono
  // sobre su fondo blanco cuadrado, sin recortar ni agrandar nada, solo
  // redimensionado a cada tamaño que piden las tiendas/el manifest.
  await sharp(PHONE_ICON).resize(192, 192).png().toFile(path.resolve(__dirname, "../public/icons/icon-192.png"));
  await sharp(PHONE_ICON).resize(512, 512).png().toFile(path.resolve(__dirname, "../public/icons/icon-512.png"));
  await sharp(PHONE_ICON)
    .resize(512, 512)
    .png()
    .toFile(path.resolve(__dirname, "../public/icons/icon-maskable-512.png"));
  await sharp(PHONE_ICON).resize(180, 180).png().toFile(path.resolve(__dirname, "../public/icons/apple-touch-icon.png"));
  console.log("pwa/app icons saved");

  // Ícono negro y blanco (transparentes) para el login/registro/
  // onboarding — se muestra uno u otro según el tema con clases
  // dark:/hidden en vez de generar una sola imagen "mixta". Se
  // redimensionan un poco (siguen con calidad de sobra para pantalla) —
  // los originales pesan casi 300 KB cada uno.
  await sharp(ICON_BLACK).resize(480).png().toFile(path.resolve(__dirname, "../public/aretia-icon-black.png"));
  await sharp(ICON_WHITE).resize(480).png().toFile(path.resolve(__dirname, "../public/aretia-icon-white.png"));
  console.log("auth icons (black/white) saved");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
