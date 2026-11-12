import crypto from "crypto";
import prisma from "../config/prisma";

let avisoMostrado = false;

/**
 * HU-048: huella irreversible del correo (HMAC-SHA256 con una clave secreta).
 * Permite reconocer a quien vuelve después de eliminar su cuenta sin guardar su correo.
 * Devuelve null si falta CLAVE_HUELLA_CORREO (entonces simplemente no se lo reconoce).
 */
export function huellaCorreo(correo: string): string | null {
  const clave = process.env.CLAVE_HUELLA_CORREO?.trim();
  if (!clave) {
    if (!avisoMostrado) {
      console.warn(
        "[Huella] Falta CLAVE_HUELLA_CORREO: no se reconocerá a quien vuelva tras eliminar su cuenta",
      );
      avisoMostrado = true;
    }
    return null;
  }
  return crypto
    .createHmac("sha256", clave)
    .update(correo.trim().toLowerCase())
    .digest("hex");
}

/** true si este correo perteneció a una cuenta que su dueño eliminó. */
export async function fueCuentaEliminada(correo: string): Promise<boolean> {
  const huella = huellaCorreo(correo);
  if (!huella) return false;
  const cuenta = await prisma.usuario.findFirst({
    where: { huella_correo: huella, eliminado_en: { not: null } },
    select: { id_usuario: true },
  });
  return cuenta !== null;
}
