import CerrarSesion from "../cerrar-sesion";

export default function NoAutorizado() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-3 text-center">
        <h1 className="text-lg font-bold text-slate-900">Cuenta no autorizada</h1>
        <p className="text-sm text-slate-500">
          Tu sesión es válida, pero este correo no está en la lista de coordinadores
          autorizados de Primera Hora. Si deberías tener acceso, pide que agreguen tu
          correo a la variable de entorno <code>COORDINADORES_AUTORIZADOS</code>.
        </p>
        <CerrarSesion />
      </div>
    </main>
  );
}
