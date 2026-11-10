import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma";
import {
  AppError,
  conflict,
  forbidden,
  unauthorized,
} from "../../errors/AppError";
import {
  enviarVerificacion,
  verificacionVencida,
  CODIGO_CORREO_NO_VERIFICADO,
  MENSAJE_CORREO_NO_VERIFICADO,
} from "./verificacion.service";
import {
  SALT_ROUNDS,
  JWT_EXPIRES_IN,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from "../../constants";
import { iniciarDesafio2FA, verificarDesafio2FA } from "./dobleFactor.service";
import { enviarCorreo } from "../../shared/correo";
import { plantillaCorreo } from "../../shared/plantillaCorreo";

interface RegisterInput {
  nombre: string;
  correo: string;
  password: string;
}

interface LoginInput {
  correo: string;
  password: string;
}

// Datos públicos del usuario que recibe el frontend (coinciden con el tipo Usuario del cliente)
function usuarioPublico(usuario: {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  verificado: boolean;
  created_at: Date;
}) {
  return {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    activo: usuario.activo,
    verificado: usuario.verificado,
    created_at: usuario.created_at,
  };
}

/** El token incluye token_version (tv): al cerrar sesión cambia, y los tokens viejos dejan de valer (HU-003 CA-3). */
export function signToken(usuario: {
  id_usuario: number;
  correo: string;
  rol: string;
  token_version: number;
}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no definido");
  return jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
      rol: usuario.rol,
      tv: usuario.token_version,
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

/** Invalida todos los tokens del usuario: los ya emitidos dejan de pasar el middleware. */
export async function invalidarSesiones(idUsuario: number): Promise<void> {
  await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: { token_version: { increment: 1 } },
  });
}

function mensajeBloqueo(hasta: Date): string {
  const minutos = Math.max(1, Math.ceil((hasta.getTime() - Date.now()) / 60_000));
  return `Por seguridad bloqueamos tu cuenta por demasiados intentos fallidos. Podrás intentarlo de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;
}

/** HU-045 CA-5: correo de aviso del bloqueo (enviarCorreo nunca lanza error). */
async function avisarBloqueo(usuario: {
  id_usuario: number;
  nombre: string;
  correo: string;
}): Promise<void> {
  const html = plantillaCorreo({
    titulo: "Bloqueamos el acceso a tu cuenta",
    saludo: `Hola, ${usuario.nombre}:`,
    parrafos: [
      `Hubo ${MAX_LOGIN_ATTEMPTS} intentos seguidos de iniciar sesión con una contraseña incorrecta, así que bloqueamos tu cuenta por ${LOCKOUT_DURATION_MINUTES} minutos.`,
      "Si fuiste tú, espera y vuelve a intentarlo. Si no fuiste tú, te recomendamos cambiar tu contraseña.",
    ],
    boton: {
      texto: "Cambiar mi contraseña",
      url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/recuperar`,
    },
  });
  await enviarCorreo({
    para: usuario.correo,
    asunto: "Med-IA: bloqueamos el acceso a tu cuenta",
    html,
    tipo: "aviso_seguridad",
    idUsuario: usuario.id_usuario,
  });
}

export async function registerUsuario(input: RegisterInput) {
  const existente = await prisma.usuario.findUnique({
    where: { correo: input.correo },
  });
  if (existente) throw conflict("El correo ya está registrado");

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Usuario y perfil de paciente se crean juntos: si falla uno, no queda un usuario huérfano
  const usuario = await prisma.usuario.create({
    data: {
      nombre: input.nombre,
      correo: input.correo,
      password_hash: passwordHash,
      rol: "paciente",
      paciente: { create: {} },
    },
  });
  // HU-044: correo de verificación. Sin await: el registro no espera al correo
  void enviarVerificacion(usuario).catch((error) =>
    console.error(
      "[Verificación] No se pudo enviar el enlace:",
      (error as Error).message,
    ),
  );
  const token = signToken(usuario);
  return { token, usuario: usuarioPublico(usuario) };
}

export async function loginUsuario(input: LoginInput) {
  const usuario = await prisma.usuario.findUnique({
    where: { correo: input.correo },
  });
  // HU-048: una cuenta eliminada responde igual que una que no existe
  if (!usuario || usuario.eliminado_en)
    throw unauthorized("Credenciales inválidas");

  const ahora = new Date();
  // HU-045 CA-3: el aviso indica cuánto falta para que termine el bloqueo
  if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > ahora) {
    throw unauthorized(mensajeBloqueo(usuario.bloqueado_hasta));
  }

  const passwordValida = await bcrypt.compare(
    input.password,
    usuario.password_hash,
  );

  if (!passwordValida) {
    // HU-045 CA-2: si hubo un bloqueo (ya vencido: uno vigente se rechazó arriba),
    // el conteo empieza de cero y un solo error no vuelve a bloquear la cuenta
    const bloqueoVencido = usuario.bloqueado_hasta !== null;
    const nuevosIntentos = (bloqueoVencido ? 0 : usuario.intentos_fallidos) + 1;
    const bloqueoHasta =
      nuevosIntentos >= MAX_LOGIN_ATTEMPTS
        ? new Date(ahora.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : null;

    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: {
        intentos_fallidos: nuevosIntentos,
        bloqueado_hasta: bloqueoHasta,
      },
    });

    if (bloqueoHasta) {
      // HU-045 CA-1 y CA-5: se avisa en pantalla y por correo
      void avisarBloqueo(usuario);
      throw unauthorized(mensajeBloqueo(bloqueoHasta));
    }
    throw unauthorized("Credenciales inválidas");
  }

  // HU-002 CA-5: con credenciales correctas, una cuenta desactivada recibe un aviso específico
  if (!usuario.activo) {
    throw forbidden(
      "Tu cuenta está desactivada. Comunícate con el administrador para reactivarla.",
    );
  }

  // Reset intentos al hacer login exitoso
  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: { intentos_fallidos: 0, bloqueado_hasta: null },
  });
  // HU-044: pasadas 24 h sin verificar, el paciente debe verificar su correo para entrar
  if (verificacionVencida(usuario)) {
    throw new AppError(
      MENSAJE_CORREO_NO_VERIFICADO,
      403,
      CODIGO_CORREO_NO_VERIFICADO,
    );
  }
  // HU-046: el médico con verificación en dos pasos recibe un código por correo en lugar del token
  if (usuario.rol === "medico" && usuario.doble_factor) {
    return iniciarDesafio2FA(usuario);
  }
  const token = signToken(usuario);
  return { token, usuario: usuarioPublico(usuario) };
}
/** HU-046: segundo paso del login. Con el código correcto entrega el token de sesión. */
export async function completarLogin2FA(desafio: unknown, codigo: unknown) {
  const idUsuario = await verificarDesafio2FA(desafio, codigo);

  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
  });
  if (!usuario || !usuario.activo || usuario.eliminado_en) {
    throw unauthorized("Credenciales inválidas");
  }

  const token = signToken(usuario);
  return { token, usuario: usuarioPublico(usuario) };
}
