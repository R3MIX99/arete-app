#!/usr/bin/env python3
"""Sirve build/web como SPA: cualquier ruta que no sea un archivo real cae
a index.html, para que las rutas del router de Flutter (por ejemplo
/invitacion/<token>) funcionen al abrirlas directo, no solo navegando
dentro de la app ya cargada.

python -m http.server NO hace esto — devuelve 404 en cualquier ruta que
no sea un archivo físico. Cualquier hosting real (Firebase Hosting,
Netlify, Vercel, nginx) necesita esta misma regla de reescritura antes de
publicar la app; este script es el equivalente mínimo para probar en
local.

Uso: python scripts/serve_web.py [puerto]  (por defecto 8766)
"""

import http.server
import os
import sys


class SpaFallbackHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Quita query string y fragmento antes de resolver el archivo.
        clean_path = path.split("?", 1)[0].split("#", 1)[0]
        candidate = super().translate_path(clean_path)
        if os.path.isfile(candidate):
            return candidate
        # No es un archivo real (assets/, main.dart.js, etc. ya cayeron
        # arriba): es una ruta del router de Flutter, sirve index.html y
        # deja que la app decida que mostrar.
        return super().translate_path("/index.html")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    web_dir = os.path.join(os.path.dirname(__file__), "..", "build", "web")
    os.chdir(web_dir)
    server = http.server.ThreadingHTTPServer(("", port), SpaFallbackHandler)
    print(f"Sirviendo {os.path.abspath(web_dir)} en http://localhost:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
