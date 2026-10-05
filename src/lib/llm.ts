import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode, Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";

// Modelo rápido del nivel gratuito de Gemini — apropiado para una
// clasificación corta, no para razonamiento largo. Ver docs/PACKET.md
// (Arquitectura + stack). gemini-2.5-flash fue retirado para cuentas
// nuevas (oct 2026); gemini-3.8-flash es el reemplazo vigente.
const MODELO = "gemini-3.8-flash";

const esquemaClasificacion = z.object({
  severidad: z.enum(["baja", "media", "alta", "critica"]),
  checklist: z.array(z.string()).min(2).max(6),
  borrador_aviso: z.string().min(1),
});

export type ClasificacionIncidente = z.infer<typeof esquemaClasificacion>;

const CLASIFICACION_RESPALDO: ClasificacionIncidente = {
  severidad: "media",
  checklist: [
    "No se pudo generar una checklist automática — aísla el sistema afectado de la red mientras esperas revisión manual.",
    "No apagues el equipo: puede borrar evidencia útil para el análisis posterior.",
  ],
  borrador_aviso:
    "No se pudo generar un borrador automático esta vez. Un coordinador debe redactar el aviso manualmente antes de enviarlo.",
};

const declaracionClasificar: FunctionDeclaration = {
  name: "clasificar_incidente",
  description:
    "Registra la clasificación de severidad, la checklist de contención y el borrador de aviso.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      severidad: {
        type: Type.STRING,
        format: "enum",
        enum: ["baja", "media", "alta", "critica"],
      },
      checklist: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "2 a 6 pasos concretos de contención inmediata, en español, cada uno una oración corta.",
      },
      borrador_aviso: {
        type: Type.STRING,
        description: "Borrador corto de aviso a pacientes, en español, tono claro y no alarmista.",
      },
    },
    required: ["severidad", "checklist", "borrador_aviso"],
  },
};

// Clasifica un incidente y redacta un borrador de aviso a pacientes.
// Fuerza una llamada de función (FunctionCallingConfigMode.ANY) en vez de
// pedirle a la IA que devuelva JSON en texto libre, para que la respuesta
// siempre tenga la forma exacta que esperamos. Si de todos modos algo
// falla (red, límite del nivel gratuito, respuesta inesperada), se
// devuelve CLASIFICACION_RESPALDO en vez de tronar la ruta completa — el
// envío del incidente nunca debe fallar solo porque la IA no contestó.
export async function clasificarIncidente(datos: {
  sistemaAfectado: string;
  tipoDato: string;
  descripcion: string;
  passwordComprometida: boolean | null;
}): Promise<ClasificacionIncidente> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Falta GEMINI_API_KEY — usando clasificación de respaldo.");
    return CLASIFICACION_RESPALDO;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const contextoPassword =
      datos.passwordComprometida === true
        ? "La contraseña de prueba reportada SÍ aparece en filtraciones conocidas."
        : datos.passwordComprometida === false
        ? "La contraseña de prueba reportada no aparece en filtraciones conocidas."
        : "No se revisó ninguna contraseña para este incidente.";

    const respuesta = await ai.models.generateContent({
      model: MODELO,
      contents:
        "Eres un asistente de triage de incidentes de ciberseguridad para proveedores de TI " +
        "que atienden pymes mexicanas (clínicas, despachos pequeños) sin equipo propio de " +
        "seguridad. Clasificas severidad y redactas un borrador de aviso a pacientes, SIEMPRE " +
        "en español, SIEMPRE dejando claro que es un borrador que un humano debe revisar antes " +
        "de enviar. Nunca das asesoría legal definitiva — solo una redacción inicial razonable " +
        "basada en que la LFPDPPP mexicana exige notificar a las personas afectadas.\n\n" +
        `Sistema afectado: ${datos.sistemaAfectado}\n` +
        `Tipo de dato en riesgo: ${datos.tipoDato}\n` +
        `Descripción del proveedor de TI: ${datos.descripcion}\n` +
        `Contraseña de prueba: ${contextoPassword}\n\n` +
        "Clasifica la severidad y genera la checklist de contención inmediata y el borrador de aviso.",
      config: {
        tools: [{ functionDeclarations: [declaracionClasificar] }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: ["clasificar_incidente"],
          },
        },
      },
    });

    const llamada = respuesta.functionCalls?.[0];
    if (!llamada || !llamada.args) {
      console.error("La IA no devolvió una llamada de función — usando respaldo.");
      return CLASIFICACION_RESPALDO;
    }

    const resultado = esquemaClasificacion.safeParse(llamada.args);
    if (!resultado.success) {
      console.error("Clasificación de la IA no pasó validación:", resultado.error.message);
      return CLASIFICACION_RESPALDO;
    }

    return resultado.data;
  } catch (err) {
    console.error("Error llamando a la IA de clasificación:", err);
    return CLASIFICACION_RESPALDO;
  }
}
