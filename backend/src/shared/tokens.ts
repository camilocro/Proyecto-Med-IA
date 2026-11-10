import crypto from "crypto";

const BYTES_TOKEN = 32; // 256 bits: imposible de adivinar

/** Token aleatorio para enlaces de un solo uso (recuperar contraseña, verificar correo). */
export function generarToken(): string {
  return crypto.randomBytes(BYTES_TOKEN).toString("hex");
}

/**
 * En la base se guarda solo el hash del token: si alguien leyera la tabla, no podría usar
 * los enlaces pendientes. SHA-256 alcanza (no hace falta bcrypt) porque el token es aleatorio
 * de 256 bits, y además permite buscarlo directo por su hash.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function horasDesdeAhora(horas: number): Date {
  return new Date(Date.now() + horas * 60 * 60 * 1000);
}

/** Formato de un token generado por generarToken: 64 caracteres hexadecimales. */
export function esTokenValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^[a-f0-9]{64}$/.test(valor);
}
