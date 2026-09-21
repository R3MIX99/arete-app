import localFont from "next/font/local";

/** Fuente del panel del cliente (Outfit, variable: pesos de 100 a 900 en un
 * solo archivo). Archivo propio en src/fonts, con su licencia OFL al lado.
 *
 * Se aplica con `outfit.className` en el contenedor del panel y también en
 * el contenido de los menús y diálogos, que Radix monta fuera de ese
 * contenedor y por eso no la heredarían. */
export const outfit = localFont({
  src: "../fonts/Outfit-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-outfit",
});
