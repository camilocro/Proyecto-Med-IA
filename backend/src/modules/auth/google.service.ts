import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../../config/prisma";
import { AppError, forbidden, unauthorized } from "../../errors/AppError";
import { SALT_ROUNDS, MAX_LONGITUD_NOMBRE } from "../../constants";
import { iniciarDesafio2FA } from "./dobleFactor.service";
import { registrarIntentoLogin } from "./intentos.service";
import { signToken, usuarioPublico } from "./auth.service";

const TIMEOUT_SUPABASE_MS = 10_000;
const MENSAJE_GOOGLE_INVALIDO =
  "No pudimos verificar tu cuenta de Google. Intenta de nuevo.";

/** Lo que devuelve Supabase en /auth/v1/user (solo los campos que usamos). */
interface UsuarioSupabase {
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: { full_name?: string; name?: string };
  app_metadata?: { provider?: string; providers?: string[] };
}

/**
 * Pregunta a Supabase de quién es el access_token. Supabase solo lo entrega después de que
 * Google confirmó la identidad, así que el correo es real y está verificado.
 */
async function obtenerCuentaGoogle(
  accessToken: string,
): Promise<{ correo: string; nombre: string }> {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey)
    throw new Error("SUPABASE_URL o SUPABASE_ANON_KEY no definidos");

  let respuesta;
  try {
    respuesta = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_SUPABASE_MS),
    });
  } catch {
    throw new AppError(
      "No pudimos comunicarnos con Google. Intenta de nuevo.",
      503,
    );
  }
  if (!respuesta.ok) throw unauthorized(MENSAJE_GOOGLE_INVALIDO);

  const datos = (await respuesta.json()) as UsuarioSupabase;
  const proveedores = datos.app_metadata?.providers ?? [
    datos.app_metadata?.provider,
  ];
  if (
    !proveedores.includes("google") ||
    !datos.email ||
    !datos.email_confirmed_at
  ) {
    throw unauthorized(MENSAJE_GOOGLE_INVALIDO);
  }

  const correo = datos.email.trim().toLowerCase();
  const nombre = (
    datos.user_metadata?.full_name ||
    datos.user_metadata?.name ||
    correo.split("@")[0]
  )
    .trim()
    .slice(0, MAX_LONGITUD_NOMBRE);
  return { correo, nombre };
}

/** Busca la cuenta por correo; si no existe, crea un paciente ya verificado. */
async function entrarOCrearCuenta(correo: string, nombre: string) {
  let usuario = await prisma.usuario.findFirst({
    where: { correo: { equals: correo, mode: "insensitive" } },
  });

  if (usuario?.eliminado_en) {
    throw unauthorized(
      "Esta cuenta fue eliminada y no se puede volver a usar.",
    );
  }

  if (!usuario) {
    // Sin contraseña propia: se guarda una aleatoria que nadie conoce.
    // Si después quiere entrar con correo y contraseña, usa "¿Olvidaste tu contraseña?".
    const passwordHash = await bcrypt.hash(
      crypto.randomBytes(32).toString("hex"),
      SALT_ROUNDS,
    );
    usuario = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        password_hash: passwordHash,
        rol: "paciente",
        verificado: true, // Google ya verificó el correo (HU-044)
        paciente: { create: {} },
      },
    });
  } else {
    if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
      throw unauthorized(
        "Cuenta bloqueada temporalmente por múltiples intentos fallidos",
      );
    }
    if (!usuario.activo) {
      throw forbidden(
        "Tu cuenta está desactivada. Comunícate con el administrador para reactivarla.",
      );
    }
    if (!usuario.verificado) {
      usuario = await prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: { verificado: true },
      });
    }
  }

  // HU-046: el médico con verificación en dos pasos igual debe ingresar el código
  if (usuario.rol === "medico" && usuario.doble_factor) {
    return iniciarDesafio2FA(usuario);
  }
  return { token: signToken(usuario), usuario: usuarioPublico(usuario) };
}

/**
 * Inicio de sesión con Google. Responde lo mismo que /auth/login: { token, usuario }
 * o { requiere2FA, desafio } para el médico con verificación en dos pasos.
 */
export async function loginConGoogle(accessToken: string, ip: string) {
  const { correo, nombre } = await obtenerCuentaGoogle(accessToken);

  try {
    const resultado = await entrarOCrearCuenta(correo, nombre);
    // HU-047: con 2FA, el acceso se registra al completar el código en /auth/2fa
    if (!("requiere2FA" in resultado)) {
      await registrarIntentoLogin({
        correo,
        ip,
        exitoso: true,
        idUsuario: resultado.usuario.id_usuario,
      });
    }
    return resultado;
  } catch (error) {
    await registrarIntentoLogin({ correo, ip, exitoso: false });
    throw error;
  }
}
