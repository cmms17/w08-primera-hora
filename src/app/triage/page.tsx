"use client";
import { useEffect, useState } from "react";

type ResultadoTriage = {
  id: string;
  estado: string;
  minutosRestantesSla: number;
  severidad: string;
  checklist: string[];
  borradorAviso: string;
  passwordComprometida: boolean | null;
  passwordRevisada: boolean;
};

const ETIQUETA_SEVERIDAD: Record<string, { texto: string; clase: string }> = {
  baja: { texto: "BAJA", clase: "bg-emerald-100 text-emerald-800" },
  media: { texto: "MEDIA", clase: "bg-amber-100 text-amber-800" },
  alta: { texto: "ALTA", clase: "bg-rose-100 text-rose-800" },
  critica: { texto: "CRÍTICA", clase: "bg-rose-200 text-rose-900" },
};

function CuentaRegresiva({ minutosIniciales }: { minutosIniciales: number }) {
  const [segundos, setSegundos] = useState(Math.round(minutosIniciales * 60));

  useEffect(() => {
    const t = setInterval(() => {
      setSegundos((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  const agotado = segundos <= 0;

  return (
    <div
      className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
        agotado ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"
      }`}
    >
      <span className={`text-xs font-bold ${agotado ? "text-rose-700" : "text-amber-700"}`}>
        {agotado ? "SLA vencido — se auto-escaló" : "SLA de coordinación"}
      </span>
      <span className={`text-lg font-extrabold ${agotado ? "text-rose-700" : "text-amber-700"}`}>
        {agotado ? "ESCALADO" : `${min}:${seg.toString().padStart(2, "0")} min`}
      </span>
    </div>
  );
}

export default function Triage() {
  const [aliasReportante, setAliasReportante] = useState("");
  const [sistemaAfectado, setSistemaAfectado] = useState("");
  const [tipoDato, setTipoDato] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [passwordPrueba, setPasswordPrueba] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoTriage | null>(null);

  async function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const resp = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aliasReportante,
          sistemaAfectado,
          tipoDato,
          descripcion,
          passwordPrueba: passwordPrueba || undefined,
        }),
      });
      const datos = await resp.json();
      if (!resp.ok) {
        setError(datos.error ?? "No se pudo enviar el reporte.");
        return;
      }
      setResultado(datos);
    } catch {
      setError("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    const sev = ETIQUETA_SEVERIDAD[resultado.severidad] ?? ETIQUETA_SEVERIDAD.media;
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Incidente registrado</h1>
            <p className="text-xs text-slate-500">
              Coordinación ya puede ver este caso en su cola. Guarda esta pantalla — no podrás
              volver a verla sin iniciar sesión.
            </p>
          </div>

          <CuentaRegresiva minutosIniciales={resultado.minutosRestantesSla} />

          {resultado.passwordRevisada && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold border ${
                resultado.passwordComprometida === true
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : resultado.passwordComprometida === false
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              {resultado.passwordComprometida === true &&
                "⚠ La contraseña de prueba aparece en filtraciones conocidas — cámbiala ya."}
              {resultado.passwordComprometida === false &&
                "✓ La contraseña de prueba no aparece en filtraciones conocidas."}
              {resultado.passwordComprometida === null &&
                "No se pudo revisar la contraseña ahora mismo (reinténtalo si es crítico)."}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Checklist de contención</h2>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${sev.clase}`}>
                SEVERIDAD {sev.texto}
              </span>
            </div>
            <ol className="text-sm text-slate-700 space-y-1.5 list-decimal list-inside">
              {resultado.checklist.map((paso, i) => (
                <li key={i}>{paso}</li>
              ))}
            </ol>
            <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
              Generado por IA
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
            <h2 className="text-sm font-bold text-slate-800">Borrador de aviso a pacientes</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{resultado.borradorAviso}</p>
            <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
              Borrador — no es asesoría legal. Solo un coordinador humano puede revisarlo y
              marcarlo como enviado.
            </p>
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Ningún dato real de pacientes. Esta demo usa solo información de prueba.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <form onSubmit={alEnviar} className="max-w-md mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Primera Hora — reportar incidente</h1>
          <p className="text-xs text-slate-500">
            Sin cuenta. Describe lo que ves — esto activa el cronómetro de coordinación.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Tu alias (no tu nombre real)
          </label>
          <input
            required
            maxLength={80}
            value={aliasReportante}
            onChange={(e) => setAliasReportante(e.target.value)}
            placeholder="ej. proveedor-ti-memo"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Sistema afectado
          </label>
          <input
            required
            maxLength={200}
            value={sistemaAfectado}
            onChange={(e) => setSistemaAfectado(e.target.value)}
            placeholder="ej. expedientes de pacientes (servidor local)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Tipo de dato en riesgo
          </label>
          <input
            required
            maxLength={200}
            value={tipoDato}
            onChange={(e) => setTipoDato(e.target.value)}
            placeholder="ej. datos de pago, historial clínico"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            ¿Qué viste? Descríbelo
          </label>
          <textarea
            required
            maxLength={2000}
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="ej. archivos cifrados desde las 9am, nota de rescate en el escritorio"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Contraseña de prueba a revisar (opcional)
          </label>
          <input
            type="password"
            maxLength={200}
            value={passwordPrueba}
            onChange={(e) => setPasswordPrueba(e.target.value)}
            placeholder="se revisa por k-anonimato, nunca se guarda"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Nunca uses una contraseña real de producción — usa una de prueba. Solo se envía un
            prefijo de su hash, nunca la contraseña.
          </p>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-[#7a1f2b] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {enviando ? "Enviando a coordinación..." : "Enviar a coordinación"}
        </button>
        <p className="text-[10px] text-slate-400 text-center">
          Ningún dato real de pacientes. Usa solo información de prueba, etiquetada como
          simulada.
        </p>
      </form>
    </main>
  );
}
