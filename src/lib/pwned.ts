import "server-only";
import { createHash } from "crypto";

// Revisa una contraseña contra la API pública de Pwned Passwords usando
// k-anonimato: solo se envían los primeros 5 caracteres del hash SHA-1 de
// la contraseña — la API nunca recibe la contraseña real ni el hash
// completo. No requiere llave ni cuenta. Si la API falla (red, timeout),
// devuelve null — el llamador debe tratar null como "no se pudo revisar",
// nunca como "no comprometida", para no dar una falsa sensación de
// seguridad.
export async function revisarPasswordFiltrada(
  password: string
): Promise<boolean | null> {
  if (!password) return null;

  try {
    const sha1 = createHash("sha1")
      .update(password, "utf8")
      .digest("hex")
      .toUpperCase();
    const prefijo = sha1.slice(0, 5);
    const sufijo = sha1.slice(5);

    const resp = await fetch(
      `https://api.pwnedpasswords.com/range/${prefijo}`,
      {
        headers: { "Add-Padding": "true" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!resp.ok) return null;

    const texto = await resp.text();
    const encontrada = texto
      .split("\n")
      .some((linea) => linea.trim().split(":")[0] === sufijo);

    return encontrada;
  } catch {
    return null;
  }
}
