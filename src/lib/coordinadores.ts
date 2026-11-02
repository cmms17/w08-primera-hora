// Lista blanca de coordinadores autorizados — defensa en profundidad.
//
// Hallazgo (Venture Milestone, Semana 12): /panel solo verificaba
// "¿hay una sesión de Supabase Auth válida?", no "¿esta persona es un
// coordinador autorizado?". Con registro por correo/contraseña, cualquiera
// que se cree una cuenta (si el proyecto de Supabase tiene el alta
// pública activada, que es el valor por defecto) pasaba la verificación y
// podía marcar incidentes como "contenido" o "aviso enviado" — exactamente
// la decisión irreversible que el Brief y la Condición 1 del Blueprint de
// equipo dicen que debe quedar en manos de un humano *responsable*, no de
// cualquier humano autenticado. Es el mismo patrón de bug que ya cacé en
// AguaClara (w11): un valor por defecto silencioso ("autenticado") parado
// en el lugar de algo que debía declararse explícitamente ("autorizado").
//
// Arreglo: toda ruta que toque /panel o sus acciones debe llamar a
// esCoordinadorAutorizado() además de revisar que exista sesión. La lista
// vive en una variable de entorno (nunca en el código ni en el repo) y
// funciona incluso si alguien logra registrarse con Supabase Auth
// directamente, sin pasar por esta UI.
const correosAutorizados = (process.env.COORDINADORES_AUTORIZADOS ?? "")
  .split(",")
  .map((correo) => correo.trim().toLowerCase())
  .filter(Boolean);

export function esCoordinadorAutorizado(email: string | null | undefined): boolean {
  if (!email) return false;
  if (correosAutorizados.length === 0) {
    // Ningún correo configurado todavía: niega por defecto. Un panel de
    // coordinación sin nadie autorizado debe quedar cerrado, no abierto.
    return false;
  }
  return correosAutorizados.includes(email.trim().toLowerCase());
}
