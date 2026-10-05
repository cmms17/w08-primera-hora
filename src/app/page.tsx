import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-5 text-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Primera Hora</h1>
          <p className="text-sm text-slate-500 mt-1">
            Triage de incidentes de brecha para el proveedor de TI de una pyme — la primera hora
            antes de que llegue cualquier forense.
          </p>
        </div>
        <Link
          href="/triage"
          className="block w-full bg-[#7a1f2b] text-white rounded-lg py-3 text-sm font-semibold"
        >
          Reportar un incidente ahora
        </Link>
        <Link
          href="/panel/login"
          className="block w-full text-xs text-slate-500 underline"
        >
          Entrar como coordinador
        </Link>
        <p className="text-[10px] text-slate-400">
          Datos de esta demo 100% simulados. Ningún dato real de pacientes.
        </p>
      </div>
    </main>
  );
}
