/* eslint-disable @typescript-eslint/no-require-imports -- script CommonJS standalone (no forma parte del build de Next) */
const sharp = require("sharp");
const path = require("path");

const ICON_BLACK = path.resolve(__dirname, "../../app/assets/logos/Aretia Logo Black.png");
const ICON_WHITE = path.resolve(__dirname, "../../app/assets/logos/Aretia Logo White.png");
const WORD_BLACK = path.resolve(__dirname, "../../app/assets/logos/Aretia Logo word black.png");
const WORD_WHITE = path.resolve(__dirname, "../../app/assets/logos/Aretia Logo word white.png");
const PHONE_ICON = path.resolve(__dirname, "../../app/assets/logos/Aretia Phone Icon mobile app.png");

async function main() {
  // Favicon (pestaña del navegador): el ícono BLANCO, sin fondo — tal
  // como se pidió. Va como archivo explícito en public/, no con la
  // convención de archivo de Next (src/app/icon.png) — esa convención
  // no estaba resolviendo bien (Chrome mostraba el globo gris de
  // "sin favicon" en vez de la imagen), así que se declara a mano en
  // metadata.icons con una ruta real y fija.
  await sharp(ICON_WHITE)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve(__dirname, "../public/favicon.png"));
  console.log("favicon.png (blanco) saved");

  // Ícono de la app (PWA / instalable / apple-touch): el archivo
  // "Aretia Phone Icon mobile app.png", pero un poco más chico dentro
  // de su cuadro (más aire alrededor, centrado) — se pidió que no
  // llenara el cuadro de lado a lado. Se escala al 82% sobre un lienzo
  // blanco (mismo blanco que ya traía de fondo el archivo original) del
  // tamaño final, así el resultado sigue siendo cuadrado y sin recorte.
  const iconOnPaddedSquare = async (size) => {
    const inner = Math.round(size * 0.82);
    const resizedIcon = await sharp(PHONE_ICON).resize(inner, inner).toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
      .composite([{ input: resizedIcon, gravity: "center" }])
      .png()
      .toBuffer();
  };

  await sharp(await iconOnPaddedSquare(192)).toFile(path.resolve(__dirname, "../public/icons/icon-192.png"));
  await sharp(await iconOnPaddedSquare(512)).toFile(path.resolve(__dirname, "../public/icons/icon-512.png"));
  await sharp(await iconOnPaddedSquare(512)).toFile(
    path.resolve(__dirname, "../public/icons/icon-maskable-512.png"),
  );
  await sharp(await iconOnPaddedSquare(180)).toFile(
    path.resolve(__dirname, "../public/icons/apple-touch-icon.png"),
  );
  console.log("pwa/app icons saved (82%, centrado)");

  // Ícono negro y blanco (transparentes, sin texto) para el login/
  // registro/onboarding — se muestra uno u otro según el tema con
  // clases dark:/hidden en vez de generar una sola imagen "mixta". Se
  // redimensionan un poco (siguen con calidad de sobra para pantalla) —
  // los originales pesan casi 300 KB cada uno.
  await sharp(ICON_BLACK).resize(480).png().toFile(path.resolve(__dirname, "../public/aretia-icon-black.png"));
  await sharp(ICON_WHITE).resize(480).png().toFile(path.resolve(__dirname, "../public/aretia-icon-white.png"));
  console.log("auth icons (black/white) saved");

  // Logo completo (ícono + "Aretia" en texto), negro y blanco — para
  // cuando un entrenador no puso su propio logo/nombre de negocio: en
  // vez del ícono genérico + la palabra "Aretia" en un <span>, se usa
  // este lockup ya armado.
  await sharp(WORD_BLACK).resize(900).png().toFile(path.resolve(__dirname, "../public/aretia-wordmark-black.png"));
  await sharp(WORD_WHITE).resize(900).png().toFile(path.resolve(__dirname, "../public/aretia-wordmark-white.png"));
  console.log("wordmark lockups (black/white) saved");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
