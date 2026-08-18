const sharp = require("sharp");
const path = require("path");

const ICON = path.resolve(__dirname, "../../app/assets/logos/Aretia Icon.png");
const LOGO = path.resolve(__dirname, "../../app/assets/logos/Aretia Logo.png");

async function main() {
  // Favicon (pestaña del navegador): el ícono blanco tal cual viene,
  // sin fondo — ya trae transparencia real, solo se redimensiona (ya es
  // cuadrado, 2000x2000, así que no hace falta recortar ni rellenar).
  await sharp(ICON).resize(512, 512).png().toFile(path.resolve(__dirname, "../src/app/icon.png"));
  console.log("icon.png (favicon) saved");

  // PWA instalable: el logo completo tal cual viene (fondo blanco, con
  // el texto "Aretia"), sin recortar nada — mismo archivo, solo cambia
  // de tamaño respetando su proporción (también 2000x2000).
  await sharp(LOGO).resize(192, 192).png().toFile(path.resolve(__dirname, "../public/icons/icon-192.png"));
  await sharp(LOGO).resize(512, 512).png().toFile(path.resolve(__dirname, "../public/icons/icon-512.png"));
  await sharp(LOGO).resize(512, 512).png().toFile(path.resolve(__dirname, "../public/icons/icon-maskable-512.png"));
  await sharp(LOGO).resize(180, 180).png().toFile(path.resolve(__dirname, "../public/icons/apple-touch-icon.png"));
  console.log("pwa icons saved");

  // Logo completo para las pantallas de login/registro/onboarding —
  // tal cual, sin recortar.
  await sharp(LOGO).png().toFile(path.resolve(__dirname, "../public/aretia-logo.png"));
  console.log("full logo saved");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
