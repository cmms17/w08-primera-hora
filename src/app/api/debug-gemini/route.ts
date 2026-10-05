import "server-only";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Ruta temporal de diagnóstico — NO es parte del producto final.
// Prueba la llamada a Gemini de forma aislada para ver el error real.
// Se borra en cuanto se identifique la causa del problema.
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "GEMINI_API_KEY no está definida" });
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const respuesta = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Responde solo con la palabra: hola",
    });
    return NextResponse.json({
      ok: true,
      texto: respuesta.text ?? null,
      keyPrefix: apiKey.slice(0, 6),
      keyLength: apiKey.length,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      keyPrefix: apiKey.slice(0, 6),
      keyLength: apiKey.length,
    });
  }
}
