import "server-only";
import { NextResponse } from "next/server";
import { GoogleGenAI, FunctionCallingConfigMode, Type, type FunctionDeclaration } from "@google/genai";

// Ruta temporal de diagnóstico — NO es parte del producto final.
// Prueba la llamada real con function calling forzado, igual que
// src/lib/llm.ts, para ver el error exacto si falla.
const declaracionClasificar: FunctionDeclaration = {
  name: "clasificar_incidente",
  description: "Registra la clasificación de severidad, la checklist de contención y el borrador de aviso.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      severidad: { type: Type.STRING, format: "enum", enum: ["baja", "media", "alta", "critica"] },
      checklist: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2 a 6 pasos" },
      borrador_aviso: { type: Type.STRING, description: "Borrador corto" },
    },
    required: ["severidad", "checklist", "borrador_aviso"],
  },
};

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "GEMINI_API_KEY no está definida" });
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const respuesta = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Sistema afectado: servidor de expedientes. Tipo de dato: expedientes médicos. Descripción: ransomware detectado. Clasifica la severidad y genera la checklist y el borrador de aviso.",
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
    return NextResponse.json({
      ok: true,
      huboLlamadaDeFuncion: Boolean(llamada),
      args: llamada?.args ?? null,
      textoPlano: respuesta.text ?? null,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
