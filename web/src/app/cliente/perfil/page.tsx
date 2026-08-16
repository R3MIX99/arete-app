import { redirect } from "next/navigation";

/** El perfil dejó de ser una pestaña propia: ahora se abre desde el
 * avatar de la barra superior y vive en /cliente/configuracion. Se
 * mantiene esta ruta redirigiendo para no romper enlaces guardados. */
export default function ClientProfileRedirect() {
  redirect("/cliente/configuracion");
}
