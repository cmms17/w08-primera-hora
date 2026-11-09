import "server-only";

// Misma técnica usada esta semana para arreglar el cuelgue de /triage
// (ver src/lib/llm.ts): cualquier llamada a un servicio externo (IA,
// base de datos, lo que sea) debe tener un límite de tiempo propio. Sin
// esto, si el servicio externo tarda o nunca contesta, el `await` se
// queda colgado para siempre y la ruta nunca responde al navegador — el
// usuario ve "cargando" sin fin, sin error y sin éxito.
//
// `conLimiteDeTiempo` corre la promesa real contra un reloj: si no
// termina antes de `limiteMs`, se da por perdida y se rechaza con un
// error claro, para que el código que llama pueda decidir qué hacer
// (normalmente: seguir con un valor de respaldo, nunca tronar la ruta
// completa por esto).
export function conLimiteDeTiempo<T>(
  promesa: Promise<T>,
  limiteMs: number,
  mensaje: string
): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(mensaje)), limiteMs)
    ),
  ]);
}
