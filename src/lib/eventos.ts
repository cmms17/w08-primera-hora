import "server-only";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { conLimiteDeTiempo } from "@/lib/timeout";

// Registro de eventos — el "stack floor" de analítica de esta semana
// (Business Bending, Semana 13). Responde una pregunta simple que antes
// no se podía responder sin abrir la base de datos a mano: ¿cuánto se
// usa esto, de verdad? Cuántos incidentes se crean, cuántas veces se
// abre el panel, cuántas acciones toma un coordinador.
//
// A propósito, nunca guarda un dato real de paciente ni la descripción
// completa de un incidente — solo el tipo de evento, una referencia
// opcional al incidente, y un detalle corto (ej. qué acción se tomó).
// Tampoco existe ningún endpoint público: la tabla `eventos` tiene RLS
// activado sin policies, igual que `incidentes` (ver docs/PACKET.md,
// Security Floor).
export type TipoEvento = "incidente_creado" | "panel_visto" | "accion_panel";

const LIMITE_EVENTOS_MS = 3000;

// Registrar un evento NUNCA debe bloquear ni romper el flujo principal.
// Si Supabase está lento, caído, o la tabla todavía no existe en algún
// entorno, el incidente o la acción del coordinador deben seguir
// funcionando igual — por eso todo error se atrapa aquí y nunca se deja
// subir. Es el mismo principio de "degradación segura" del check 5 del
// Security Floor, aplicado también al propio registro de eventos.
export async function registrarEvento(datos: {
  tipo: TipoEvento;
  incidenteId?: string | null;
  detalle?: string | null;
}): Promise<void> {
  try {
    const supabase = crearClienteSupabaseServidor();
    const { error } = await conLimiteDeTiempo(
      Promise.resolve(
        supabase.from("eventos").insert({
          tipo: datos.tipo,
          incidente_id: datos.incidenteId ?? null,
          detalle: datos.detalle ?? null,
        })
      ),
      LIMITE_EVENTOS_MS,
      "Tiempo de espera agotado registrando evento."
    );
    if (error) {
      console.error("No se pudo registrar evento (no bloqueante):", error.message);
    }
  } catch (err) {
    console.error("Error registrando evento (no bloqueante):", err);
  }
}

// Resumen de los últimos 7 días para el panel de coordinación. Si algo
// falla, devuelve ceros en vez de romper la carga de /panel — ver el
// mismo principio arriba.
export async function resumenEventosUltimos7Dias(): Promise<{
  incidentesCreados: number;
  accionesPanel: number;
  vecesAbierto: number;
}> {
  const vacio = { incidentesCreados: 0, accionesPanel: 0, vecesAbierto: 0 };
  try {
    const supabase = crearClienteSupabaseServidor();
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await conLimiteDeTiempo(
      Promise.resolve(supabase.from("eventos").select("tipo").gte("creado_en", desde)),
      LIMITE_EVENTOS_MS,
      "Tiempo de espera agotado leyendo el resumen de eventos."
    );

    if (error || !data) {
      console.error("No se pudo leer el resumen de eventos (no bloqueante):", error?.message);
      return vacio;
    }

    return data.reduce((acc, fila) => {
      if (fila.tipo === "incidente_creado") acc.incidentesCreados += 1;
      else if (fila.tipo === "accion_panel") acc.accionesPanel += 1;
      else if (fila.tipo === "panel_visto") acc.vecesAbierto += 1;
      return acc;
    }, { ...vacio });
  } catch (err) {
    console.error("Error leyendo resumen de eventos (no bloqueante):", err);
    return vacio;
  }
}
