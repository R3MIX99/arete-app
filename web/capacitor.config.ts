import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Aretia empaquetada para Android/iOS: no lleva el build de Next.js
 * adentro (webDir apunta a una carpeta vacía, solo para que Capacitor
 * no truene) — la app nativa carga la web real por `server.url`, igual
 * que hacen la mayoría de apps "wrapper" de una PWA existente. Así, un
 * despliegue nuevo en Vercel se refleja solo, sin tener que recompilar
 * ni resubir nada a las tiendas.
 *
 * server.url apunta al dominio real de producción (app.aretia.com.mx),
 * que es el que Apple y Google verifican para la versión pública.
 */
const config: CapacitorConfig = {
  appId: "mx.aretia.app",
  appName: "Aretia",
  webDir: "public-empty",
  server: {
    url: "https://app.aretia.com.mx",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#FAFAFA",
  },
};

export default config;
