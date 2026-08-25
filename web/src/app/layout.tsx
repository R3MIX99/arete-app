import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aretia",
  description: "Aretia: panel de entrenador y de cliente para gestionar clientes, rutinas, programas, nutrición y progreso.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aretia",
  },
  // Favicon declarado a mano (no con la convención de archivo
  // src/app/icon.png) — esa convención no estaba resolviendo bien:
  // Chrome mostraba el globo gris de "sin favicon" en vez del ícono.
  // Con una ruta fija en public/ el navegador la encuentra siempre.
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  // La barra de estado del teléfono (hora, batería, señal) toma este
  // color — debe coincidir con el fondo real de la app (--background
  // en globals.css) en cada tema, no con el acento de marca. Al ser dos
  // entradas con media query, el navegador cambia sola en cuanto el
  // sistema pasa de claro a oscuro o viceversa, sin recargar.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#141417" },
  ],
  width: "device-width",
  initialScale: 1,
  // El zoom táctil (pellizco) del navegador escala toda la página con
  // una transformación que Chrome/WebView en Android a veces no vuelve
  // a recortar bien en las esquinas redondeadas — deja un triángulo sin
  // repintar (confirmado con una grabación de pantalla: aparece justo
  // durante el pellizco, en cualquier tarjeta o píldora, no es un bug
  // de un componente en particular). Además, para una app empaquetada
  // como esta, hacer zoom de toda la página no es una interacción que
  // se busque — el pellizco accidental durante un entrenamiento es más
  // un estorbo que una ayuda. Quien necesita texto más grande ya tiene
  // el interruptor de accesibilidad de Configuración (ver
  // lib/large-text.ts), que agranda toda la app de forma controlada sin
  // depender del zoom del navegador.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
