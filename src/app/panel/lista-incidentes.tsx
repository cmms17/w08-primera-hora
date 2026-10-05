"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Incidente = {
  id: string;
  alias_reportante: string;
  sistema_afectado: string;
  tipo_dato: string;
  descripcion: string;
  severidad: string | null;
  password_comprometida: boolean | null;
  creado_en: string;
  confirmado_en: string | null;
  contenido_en: string | null;
  aviso_enviado_en: string | null;
  estado: string;
};

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
  nuevo: { texto: "nuevo", clase: "text-amber-700 font-semibold" },
  escalado: { texto: "ESCALADO", clase: "text-rose-700 font-bold" },
  en_manejo: { texto: "en manejo", clase: "text-indigo-700 font-semibold" },
  contenido: { texto: "contenido", clase: "text-emerald-700 font-semibold" },
};

export default function ListaIncidentes({ incidentes }: { incidentes: Incidente[] }) {
  const [cargando, setCargando] = useState<string | null>(null);
  const router = useRouter();

  async function accionar(incidenteId: string, accion: string) {
    setCargando(incidenteId + accion);
    const resp = await fetch("/api/panel/accion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidenteId, accion }),
    });
    setCargando(null);
    if (resp.ok) router.refresh();
  }

  if (incidentes.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay incidentes reportados.</p>;
  }

  return (
    <div className="space-y-3">
      {incidentes.map((inc) => {
        const estado = ETIQUETA_ESTADO[inc.estado] ?? ETIQUETA_ESTADO.nuevo;
        return (
          <div key={inc.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{inc.sistema_afectado}</p>
                <p className="text-xs text-slate-500">
                  {inc.tipo_dato} · reportado por {inc.alias_reportante} ·{" "}
                  {new Date(inc.creado_en).toLocaleString("es-MX")}
                </p>
              </div>
              {inc.severidad && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                  {inc.severidad.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">{inc.descripcion}</p>
            {inc.password_comprometida === true && (
              <p className="text-xs font-semibold text-rose-700">
                ⚠ contraseña de prueba comprometida
              </p>
            )}
            <p className="text-xs">
              Estado: <span className={estado.clase}>{estado.texto}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {!inc.confirmado_en && (
                <button
                  onClick={() => accionar(inc.id, "confirmar")}
                  disabled={cargando === inc.id + "confirmar"}
                  className="text-xs font-semibold bg-indigo-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  Confirmar
                </button>
              )}
              {!inc.contenido_en && (
                <button
                  onClick={() => accionar(inc.id, "marcar_contenido")}
                  disabled={cargando === inc.id + "marcar_contenido"}
                  className="text-xs font-semibold bg-emerald-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  Marcar contenido
                </button>
              )}
              {inc.contenido_en && !inc.aviso_enviado_en && (
                <button
                  onClick={() => accionar(inc.id, "marcar_aviso_enviado")}
                  disabled={cargando === inc.id + "marcar_aviso_enviado"}
                  className="text-xs font-semibold bg-slate-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  Marcar aviso enviado
                </button>
              )}
              {inc.aviso_enviado_en && (
                <span className="text-xs text-emerald-700 font-semibold self-center">
                  ✓ aviso enviado
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
