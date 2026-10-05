// Ventana de SLA de coordinación: 30 minutos, declarada en el Brief y en
// la pelea de Team Bending. El estado "escalado" NUNCA se guarda en la
// base de datos — se calcula en cada lectura comparando el tiempo
// transcurrido, igual que estaActivo() en w07. Es a propósito: una
// automatización que depende de un cron en segundo plano es una fuente de
// fallas más; un cálculo puro no se puede "no ejecutar".
export const MINUTOS_SLA = 30;

export type EstadoIncidente =
  | "nuevo"
  | "escalado"
  | "en_manejo"
  | "contenido";

export function calcularEstadoIncidente(incidente: {
  creado_en: string;
  confirmado_en: string | null;
  contenido_en: string | null;
}): EstadoIncidente {
  if (incidente.contenido_en) return "contenido";
  if (incidente.confirmado_en) return "en_manejo";

  const creadoMs = new Date(incidente.creado_en).getTime();
  const minutosTranscurridos = (Date.now() - creadoMs) / 60000;

  if (minutosTranscurridos > MINUTOS_SLA) return "escalado";
  return "nuevo";
}

export function minutosRestantesSla(creadoEn: string): number {
  const creadoMs = new Date(creadoEn).getTime();
  const minutosTranscurridos = (Date.now() - creadoMs) / 60000;
  return Math.max(0, MINUTOS_SLA - minutosTranscurridos);
}
