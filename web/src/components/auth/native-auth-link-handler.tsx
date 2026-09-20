"use client";

import * as React from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

import { isNativeApp } from "@/lib/hooks/use-is-native-app";
import { handleNativeOAuthUrl } from "@/lib/native-oauth";

/** Recibe en la app nativa el enlace de regreso del login con Google
 * (mx.aretia.app://auth?code=...) y termina el inicio de sesión en el
 * WebView. No dibuja nada; va en el layout raíz para estar escuchando desde
 * cualquier pantalla. */
export function NativeAuthLinkHandler() {
  React.useEffect(() => {
    if (!isNativeApp()) return;

    function process(url: string) {
      const target = handleNativeOAuthUrl(url);
      if (!target) return;
      // En iOS cierra la ventana del navegador; en Android ya se cerró sola
      // al volver a la app (allí no hace nada).
      void Browser.close().catch(() => {});
      window.location.assign(target);
    }

    const listener = App.addListener("appUrlOpen", ({ url }) => process(url));

    // Si Android cerró la app mientras el usuario estaba en el navegador, el
    // enlace la abre desde cero y llega como "URL de lanzamiento".
    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) process(launch.url);
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
