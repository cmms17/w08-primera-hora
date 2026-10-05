import { redirect } from "next/navigation";
import { crearClienteSupabaseAuth } from "@/lib/supabase/server-auth";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { calcularEstadoIncidente } from "@/lib/estado";
import CerrarSesion from "./cerrar-sesion";
import ListaIncidentes from "./lista-incidentes";

const ORDEN_PRIORIDAD: Record<string, number> = {
  escalado: 0,
  nuevo: 1,
  en_manejo: 2,
  contenido: 3,
};

export default async function PanelCoordinador() {
  const supabaseAuth = await crearClienteSupabaseAuth();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/panel/login");
  }

  const supabase = crearClienteSupabaseServidor();
  const { data: incidentes } = await supabase
    .from("incidentes")
    .select(
      "id, alias_reportante, sistema_afectado, tipo_dato, descripcion, severidad, checklist, borrador_aviso, password_comprometida, creado_en, confirmado_en, contenido_en, aviso_enviado_en, retirado"
    )
    .eq("retirado", false)
    .order("creado_en", { ascending: false });

  const conEstado = (incidentes ?? [])
    .map((inc) => ({ ...inc, estado: calcularEstadoIncidente(inc) }))
    .sort((a, b) => ORDEN_PRIORIDAD[a.estado] - ORDEN_PRIORIDAD[b.estado]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Panel de coordinación</h1>
            <p className="text-xs text-slate-500">
              Ordenado por prioridad: escalado primero. El sistema nunca envía nada solo — tú
              decides.
            </p>
          </div>
          <CerrarSesion />
        </div>
        <ListaIncidentes incidentes={conEstado} />
      </div>
    </main>
  );
}
