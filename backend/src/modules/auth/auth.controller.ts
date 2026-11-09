import { Request, Response } from "express";
import {
  registerUsuario,
  loginUsuario,
  invalidarSesiones,
  completarLogin2FA,
} from "./auth.service";
import { ok, AuthenticatedRequest } from "../../shared/types";
import { badRequest } from "../../errors/AppError";
import {
  MIN_LONGITUD_NOMBRE,
  MAX_LONGITUD_NOMBRE,
  MIN_LONGITUD_PASSWORD,
} from "../../constants";
import {
  solicitarRecuperacion,
  restablecerPassword,
  MENSAJE_ENLACE_INVALIDO,
} from "./recuperacion.service";
import { esTokenValido } from "../../shared/tokens";
import {
  verificarCorreo,
  reenviarVerificacion,
  MENSAJE_VERIFICACION_INVALIDA,
} from "./verificacion.service";

// ─── Validaciones de entrada (HU-001 CA-3/CA-4, HU-033) ──────────────────────
// Sin estas validaciones, un body incompleto llegaba a Prisma y respondía 500.

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validarCorreo(valor: unknown): string {
  if (typeof valor !== "string" || !valor.trim()) {
    throw badRequest("Ingresa tu correo electrónico");
  }
  const correo = valor.trim();
  if (!REGEX_CORREO.test(correo))
    throw badRequest("El correo electrónico no es válido");
  return correo;
}

function validarRegistro(body: unknown) {
  const { nombre, correo, password } = (body ?? {}) as Record<string, unknown>;

  if (typeof nombre !== "string" || !nombre.trim()) {
    throw badRequest("Ingresa tu nombre completo");
  }
  const nombreLimpio = nombre.trim();
  if (
    nombreLimpio.length < MIN_LONGITUD_NOMBRE ||
    nombreLimpio.length > MAX_LONGITUD_NOMBRE
  ) {
    throw badRequest(
      `El nombre debe tener entre ${MIN_LONGITUD_NOMBRE} y ${MAX_LONGITUD_NOMBRE} caracteres`,
    );
  }

  const correoValido = validarCorreo(correo);

  if (typeof password !== "string" || password.length < MIN_LONGITUD_PASSWORD) {
    throw badRequest(
      `La contraseña debe tener al menos ${MIN_LONGITUD_PASSWORD} caracteres`,
    );
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw badRequest("La contraseña debe tener al menos una letra y un número");
  }

  return { nombre: nombreLimpio, correo: correoValido, password };
}

function validarLogin(body: unknown) {
  const { correo, password } = (body ?? {}) as Record<string, unknown>;
  const correoValido = validarCorreo(correo);
  if (typeof password !== "string" || !password)
    throw badRequest("Ingresa tu contraseña");
  return { correo: correoValido, password };
}
/** Mismas reglas que el registro: 8+ caracteres, al menos una letra y un número. */
function validarPasswordNueva(password: unknown): string {
  if (typeof password !== "string" || password.length < MIN_LONGITUD_PASSWORD) {
    throw badRequest(
      `La contraseña debe tener al menos ${MIN_LONGITUD_PASSWORD} caracteres`,
    );
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw badRequest("La contraseña debe tener al menos una letra y un número");
  }
  return password;
}

const MENSAJE_RECUPERACION =
  "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.";

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  const resultado = await registerUsuario(validarRegistro(req.body));
  res.status(201).json(ok(resultado));
}

export async function login(req: Request, res: Response) {
  const resultado = await loginUsuario(validarLogin(req.body));
  res.json(ok(resultado));
}

/** HU-003 CA-3: el token usado deja de servir, aunque alguien lo haya copiado. */
export async function logout(req: Request, res: Response) {
  const { id_usuario } = (req as AuthenticatedRequest).usuario;
  await invalidarSesiones(id_usuario);
  res.json(ok({ message: "Sesión cerrada" }));
}

/** HU-004 CA-3: responde siempre lo mismo, para no revelar qué correos están registrados. */
export async function recuperar(req: Request, res: Response) {
  const correo = validarCorreo((req.body ?? {}).correo);
  await solicitarRecuperacion(correo);
  res.json(ok({ message: MENSAJE_RECUPERACION }));
}

export async function restablecer(req: Request, res: Response) {
  const { token, password } = (req.body ?? {}) as Record<string, unknown>;
  if (!esTokenValido(token)) throw badRequest(MENSAJE_ENLACE_INVALIDO);

  await restablecerPassword(token, validarPasswordNueva(password));
  res.json(
    ok({ message: "Tu contraseña se actualizó. Ya puedes iniciar sesión." }),
  );
}
export async function verificar(req: Request, res: Response) {
  const { token } = (req.body ?? {}) as Record<string, unknown>;
  if (!esTokenValido(token)) throw badRequest(MENSAJE_VERIFICACION_INVALIDA);

  await verificarCorreo(token);
  res.json(ok({ message: "Tu correo quedó verificado." }));
}

/** Responde siempre lo mismo, para no revelar qué correos están registrados. */
export async function reenviarEnlaceVerificacion(req: Request, res: Response) {
  const correo = validarCorreo((req.body ?? {}).correo);
  await reenviarVerificacion(correo);
  res.json(
    ok({
      message:
        "Si la cuenta existe y falta verificarla, te enviamos un enlace nuevo.",
    }),
  );
}
/** HU-046: segundo paso del login del médico con verificación en dos pasos. */
export async function verificar2FA(req: Request, res: Response) {
  const { desafio, codigo } = (req.body ?? {}) as Record<string, unknown>;
  res.json(ok(await completarLogin2FA(desafio, codigo)));
}
