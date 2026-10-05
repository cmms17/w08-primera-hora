import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primera Hora — triage de incidentes",
  description:
    "La primera hora después de una brecha, para el proveedor de TI de una pyme: clasificación con IA, chequeo de contraseñas filtradas y escalamiento por SLA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
