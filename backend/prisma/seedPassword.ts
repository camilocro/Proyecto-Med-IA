import crypto from "crypto";

/**
 * Contraseña para las cuentas que crea el seed (solo desarrollo local).
 * Se toma del .env; si no está, se genera una aleatoria y se muestra una sola vez en la consola.
 * Así ninguna contraseña queda escrita en el repositorio.
 */
export function passwordSeed(variable: string, cuentas: string): string {
  const desdeEnv = process.env[variable]?.trim();
  if (desdeEnv) return desdeEnv;
  const generada = crypto.randomBytes(9).toString("base64url");
  console.log(
    `  ! Sin ${variable} en el .env: contraseña generada para ${cuentas}: ${generada}`,
  );
  return generada;
}
