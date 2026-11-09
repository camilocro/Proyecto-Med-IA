import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { badRequest } from "../../errors/AppError";
import {
  SALT_ROUNDS,
  HORAS_VIGENCIA_TOKEN_CORREO,
  MINUTOS_ENTRE_CORREOS,
} from "../../constants";
import { enviarCorreo } from "../../shared/correo";
import { plantillaCorreo } from "../../shared/plantillaCorreo";
import { generarToken, hashToken, horasDesdeAhora } from "../../shared/tokens";

const TIPO_TOKEN = "recuperacion_password";

export const MENSAJE_ENLACE_INVALIDO =
  "El enlace no es válido o ya fue usado. Pide uno nuevo.";
const MENSAJE_ENLACE_VENCIDO = "El enlace venció. Pide uno nuevo.";

/**
 * HU-004: si el correo pertenece a una cuenta activa, envía un enlace para restablecer la contraseña.
 * No informa si la cuenta existe (CA-3): el controller siempre responde el mismo mensaje.
 */
export async function solicitarRecuperacion(correo: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  if (!usuario || !usuario.activo) return;

  // Un correo cada pocos minutos por cuenta
  const hace = new Date(Date.now() - MINUTOS_ENTRE_CORREOS * 60 * 1000);
  const reciente = await prisma.tokenRecuperacion.findFirst({
    where: {
      id_usuario: usuario.id_usuario,
      tipo: TIPO_TOKEN,
      created_at: { gte: hace },
    },
  });
  if (reciente) return;

  const token = generarToken();
  await prisma.$transaction([
    // Un enlace nuevo anula los anteriores que no se usaron
    prisma.tokenRecuperacion.updateMany({
      where: { id_usuario: usuario.id_usuario, tipo: TIPO_TOKEN, usado: false },
      data: { usado: true },
    }),
    prisma.tokenRecuperacion.create({
      data: {
        id_usuario: usuario.id_usuario,
        tipo: TIPO_TOKEN,
        token: hashToken(token),
        expira_en: horasDesdeAhora(HORAS_VIGENCIA_TOKEN_CORREO),
      },
    }),
  ]);

  const enlace = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/restablecer?token=${token}`;
  const html = plantillaCorreo({
    titulo: "Restablece tu contraseña",
    saludo: `Hola, ${usuario.nombre}:`,
    parrafos: [
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta de Med-IA.",
      `El enlace es válido por ${HORAS_VIGENCIA_TOKEN_CORREO} horas y se puede usar una sola vez.`,
    ],
    boton: { texto: "Restablecer contraseña", url: enlace },
    nota: "Si no pediste este cambio, ignora este correo: tu contraseña no se modificará.",
  });

  // Sin await: el usuario no espera a que salga el correo (enviarCorreo nunca lanza error)
  void enviarCorreo({
    para: usuario.correo,
    asunto: "Med-IA: restablece tu contraseña",
    html,
    tipo: TIPO_TOKEN,
    idUsuario: usuario.id_usuario,
  });
}

/**
 * HU-004: cambia la contraseña con un enlace válido. El enlace queda usado y token_version
 * sube, así se cierran todas las sesiones abiertas (por si alguien más tenía acceso).
 * También desbloquea la cuenta si estaba bloqueada por intentos fallidos.
 */
export async function restablecerPassword(
  token: string,
  password: string,
): Promise<void> {
  const registro = await prisma.tokenRecuperacion.findUnique({
    where: { token: hashToken(token) },
  });
  if (!registro || registro.tipo !== TIPO_TOKEN || registro.usado)
    throw badRequest(MENSAJE_ENLACE_INVALIDO);
  if (registro.expira_en < new Date()) throw badRequest(MENSAJE_ENLACE_VENCIDO);

  // Se marca como usado solo si sigue sin usar: si llegan dos envíos a la vez, solo uno pasa
  const { count } = await prisma.tokenRecuperacion.updateMany({
    where: { id: registro.id, usado: false },
    data: { usado: true },
  });
  if (count === 0) throw badRequest(MENSAJE_ENLACE_INVALIDO);

  await prisma.usuario.update({
    where: { id_usuario: registro.id_usuario },
    data: {
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      token_version: { increment: 1 },
    },
  });
}
