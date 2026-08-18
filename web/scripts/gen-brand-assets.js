const sharp = require("sharp");
const path = require("path");

const ICON = path.resolve(__dirname, "../../app/assets/logos/Aretia Icon.png");
const LOGO = path.resolve(__dirname, "../../app/assets/logos/Aretia Logo.png");
const BRAND_BLUE = "#4F46E5";

// "contain" con fondo transparente evita estirar la marca cuando no es
// cuadrada.
const containTransparent = { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } };

async function main() {
  // Los íconos (favicon, PWA, maskable, apple-touch) usan
  // "Aretia Icon.png": ya viene con transparencia real (silueta blanca
  // exportada con canal alfa de verdad), a diferencia de
  // "Aretia Logo.png", que trae fondo blanco sólido — intentar
  // reconstruir el alfa de ese archivo (de-matte) falla porque el
  // laurel y la greca del diseño también son blancos: no hay forma de
  // distinguir "blanco de fondo" de "blanco del propio dibujo". Por eso
  // el ícono va sobre un cuadro sólido del azul de marca, usando el
  // Icon.png (silueta) como máscara — se ve limpio en cualquier fondo.
  const iconOnBlue = async (size) => {
    const mark = await sharp(ICON).resize(size, size, containTransparent).png().toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: BRAND_BLUE } })
      .composite([{ input: mark }])
      .png()
      .toBuffer();
  };

  await sharp(await iconOnBlue(512)).toFile(path.resolve(__dirname, "../src/app/icon.png"));
  console.log("icon.png saved");

  await sharp(await iconOnBlue(192)).toFile(path.resolve(__dirname, "../public/icons/icon-192.png"));
  await sharp(await iconOnBlue(512)).toFile(path.resolve(__dirname, "../public/icons/icon-512.png"));
  console.log("pwa icons saved");

  // Maskable: la marca un poco más chica (70%) para dejar la zona de
  // seguridad que exige la spec — si no, un launcher circular la recorta.
  const maskableSize = 512;
  const markSize = Math.round(maskableSize * 0.7);
  const maskableMark = await sharp(ICON).resize(markSize, markSize, containTransparent).png().toBuffer();
  await sharp({ create: { width: maskableSize, height: maskableSize, channels: 4, background: BRAND_BLUE } })
    .composite([{ input: maskableMark, gravity: "center" }])
    .png()
    .toFile(path.resolve(__dirname, "../public/icons/icon-maskable-512.png"));
  console.log("maskable icon saved");

  await sharp(await iconOnBlue(180)).toFile(path.resolve(__dirname, "../public/icons/apple-touch-icon.png"));
  console.log("apple touch icon saved");

  // El logo completo (marca + "Aretia") para login/registro/onboarding
  // se deja tal cual viene, con su fondo blanco — recortado apenas para
  // quitar el margen sobrante. Va dentro de una tarjeta blanca en la UI
  // (ver los formularios de auth), así se ve bien tanto en tema claro
  // como oscuro sin depender de transparencia que este archivo no trae.
  const logoTrimmed = await sharp(LOGO).png().toBuffer();
  const trimmedBuf = await sharp(logoTrimmed).trim({ background: "#ffffff" }).png().toBuffer();
  await sharp(trimmedBuf).toFile(path.resolve(__dirname, "../public/aretia-logo.png"));
  console.log("full logo saved");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
