import { NextResponse } from "next/server";
import { z } from "zod";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { revisarPasswordFiltrada } from "@/lib/pwned";
import { clasificarIncidente } from "@/lib/llm";
import { calcularEstadoIncidente, minutosRestantesSla } from "@/lib/estado";

// Validación estricta de entrada — nada entra crudo a la base de datos ni
// al prompt de la IA (Security Floor). La contraseña de prueba es opcional
// y NUNCA se guarda: solo se usa para el chequeo de k-anonimato y se
// descarta.
const cuerpoEsperado = z.object({
  aliasReportante: z.string().trim().min(1).max(80),
  sistemaAfectado: z.string().trim().min(1).max(200),
  tipoDato: z.string().trim().min(1).max(200),
  descripcion: z.string().trim().min(1).max(2000),
  passwordPrueba: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const resultado = cuerpoEsperado.safeParse(cuerpo);
  if (!resultado.success) {
    return NextResponse.json(
      { error: "Datos inválidos. Revisa que todos los campos requeridos estén llenos." },
      { status: 400 }
    );
  }
  const { aliasReportante, sistemaAfectado, tipoDato, descripcion, passwordPrueba } =
    resultado.data;

  const passwordComprometida = passwordPrueba
    ? await revisarPasswordFiltrada(passwordPrueba)
    : null;

  const clasificacion = await clasificarIncidente({
    sistemaAfectado,
    tipoDato,
    descripcion,
    passwordComprometida,
  });

  try {
    const supabase = crearClienteSupabaseServidor();
    const { data, error } = await supabase
      .from("incidentes")
      .insert({
        alias_reportante: aliasReportante,
        sistema_afectado: sistemaAfectado,
        tipo_dato: tipoDato,
        descripcion,
        password_revisada: passwordPrueba ? true : false,
        password_comprometida: passwordComprometida,
        severidad: clasificacion.severidad,
        checklist: JSON.stringify(clasificacion.checklist),
        borrador_aviso: clasificacion.borrador_aviso,
      })
      .select("id, creado_en, confirmado_en, contenido_en")
      .single();

    if (error || !data) {
      console.error("Error guardando incidente:", error?.message);
      return NextResponse.json(
        { error: "No se pudo guardar el incidente. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      estado: calcularEstadoIncidente(data),
      minutosRestantesSla: minutosRestantesSla(data.creado_en),
      severidad: clasificacion.severidad,
      checklist: clasificacion.checklist,
      borradorAviso: clasificacion.borrador_aviso,
      passwordComprometida,
      passwordRevisada: Boolean(passwordPrueba),
    });
  } catch (err) {
    console.error("Error en /api/triage:", err);
    return NextResponse.json(
      { error: "El servidor no pudo procesar el reporte." },
      { status: 500 }
    );
  }
}
