import { NextResponse } from "next/server";
import { z } from "zod";
import { crearClienteSupabaseAuth } from "@/lib/supabase/server-auth";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

const cuerpoEsperado = z.object({
  incidenteId: z.string().uuid(),
  accion: z.enum(["confirmar", "marcar_contenido", "marcar_aviso_enviado", "retirar"]),
});

// Acción del coordinador — requiere sesión de Supabase Auth. Las
// decisiones irreversibles (marcar contenido, marcar el aviso como
// enviado) solo pasan por aquí: ningún proceso automático llama a este
// endpoint, es lo que mantiene la decisión en manos humanas (ver "La
// sombra" en el Brief).
export async function POST(request: Request) {
  const supabaseAuth = await crearClienteSupabaseAuth();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesión no válida. Inicia sesión de nuevo." }, { status: 401 });
  }

  const cuerpo = await request.json().catch(() => null);
  const resultado = cuerpoEsperado.safeParse(cuerpo);
  if (!resultado.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const { incidenteId, accion } = resultado.data;

  const cambios: Record<string, unknown> =
    accion === "confirmar"
      ? { confirmado_en: new Date().toISOString() }
      : accion === "marcar_contenido"
      ? { contenido_en: new Date().toISOString() }
      : accion === "marcar_aviso_enviado"
      ? { aviso_enviado_en: new Date().toISOString() }
      : { retirado: true };

  try {
    const supabase = crearClienteSupabaseServidor();
    const { error } = await supabase.from("incidentes").update(cambios).eq("id", incidenteId);

    if (error) {
      console.error("Error aplicando acción de panel:", error.message);
      return NextResponse.json({ error: "No se pudo aplicar la acción." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/panel/accion:", err);
    return NextResponse.json({ error: "El servidor no pudo aplicar la acción." }, { status: 500 });
  }
}
