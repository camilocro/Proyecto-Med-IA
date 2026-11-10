import prisma from "../../config/prisma";
import { badRequest } from "../../errors/AppError";
import {
  HORAS_VIGENCIA_TOKEN_CORREO,
  MINUTOS_ENTRE_CORREOS,
} from "../../constants";
import { enviarCorreo } from "../../shared/correo";
import { plantillaCorreo } from "../../shared/plantillaCorreo";
import { generarToken, hashToken, horasDesdeAhora } from "../../shared/tokens";

const TIPO_TOKEN = "verificacion_correo";

export const CODIGO_CORREO_NO_VERIFICADO = "CORREO_NO_VERIFICADO";
export const MENSAJE_CORREO_NO_VERIFICADO =
  "Tienes que verificar tu correo para seguir usando tu cuenta. Revisa tu bandeja o pide un enlace nuevo.";
export const MENSAJE_VERIFICACION_INVALIDA =
  "El enlace de verificación no es válido o ya fue usado. Pide uno nuevo desde el inicio de sesión.";
const MENSAJE_VERIFICACION_VENCIDA =
  "El enlace de verificación venció. Pide uno nuevo desde el inicio de sesión.";

/**
 * HU-044: solo los pacientes que se registran solos deben verificar su correo.
 * Tienen 24 h de gracia; después, el login les pide verificar antes de entrar.
 * (Médicos y administradores los da de alta el administrador.)
 */
export function verificacionVencida(usuario: {
  rol: string;
  verificado: boolean;
  created_at: Date;
}): boolean {
  if (usuario.rol !== "paciente" || usuario.verificado) return false;
  const horasDesdeRegistro =
    (Date.now() - usuario.created_at.getTime()) / (60 * 60 * 1000);
  return horasDesdeRegistro > HORAS_VIGENCIA_TOKEN_CORREO;
}

/** Genera un enlace nuevo (anula los anteriores) y lo envía por correo. */
export async function enviarVerificacion(usuario: {
  id_usuario: number;
  nombre: string;
  correo: string;
}): Promise<void> {
  const token = generarToken();
  await prisma.$transaction([
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

  const enlace = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/verificar?token=${token}`;
  const html = plantillaCorreo({
    titulo: "Verifica tu correo",
    saludo: `Hola, ${usuario.nombre}:`,
    parrafos: [
      "Gracias por registrarte en Med-IA. Confirma que este correo es tuyo para mantener tu cuenta activa.",
      `El enlace es válido por ${HORAS_VIGENCIA_TOKEN_CORREO} horas. Si no lo verificas en ese plazo, te lo pediremos al iniciar sesión.`,
    ],
    boton: { texto: "Verificar mi correo", url: enlace },
    nota: "Si no creaste una cuenta en Med-IA, ignora este correo.",
  });

  await enviarCorreo({
    para: usuario.correo,
    asunto: "Med-IA: verifica tu correo",
    html,
    tipo: TIPO_TOKEN,
    idUsuario: usuario.id_usuario,
  });
}

/** Marca el correo como verificado. Abrir el enlace dos veces no es un error si ya quedó verificado. */
export async function verificarCorreo(token: string): Promise<void> {
  const registro = await prisma.tokenRecuperacion.findUnique({
    where: { token: hashToken(token) },
  });
  if (!registro || registro.tipo !== TIPO_TOKEN)
    throw badRequest(MENSAJE_VERIFICACION_INVALIDA);

  if (registro.usado) {
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: registro.id_usuario },
      select: { verificado: true },
    });
    if (usuario?.verificado) return; // doble clic o enlace abierto otra vez
    throw badRequest(MENSAJE_VERIFICACION_INVALIDA);
  }
  if (registro.expira_en < new Date())
    throw badRequest(MENSAJE_VERIFICACION_VENCIDA);

  await prisma.$transaction([
    prisma.tokenRecuperacion.update({
      where: { id: registro.id },
      data: { usado: true },
    }),
    prisma.usuario.update({
      where: { id_usuario: registro.id_usuario },
      data: { verificado: true },
    }),
  ]);
}

/**
 * Reenvía el enlace (HU-044). No revela si la cuenta existe: el controller siempre responde
 * lo mismo. Solo envía a pacientes activos sin verificar, como máximo uno cada pocos minutos.
 */
export async function reenviarVerificacion(correo: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  if (
    !usuario ||
    !usuario.activo ||
    usuario.verificado ||
    usuario.rol !== "paciente"
  )
    return;

  const hace = new Date(Date.now() - MINUTOS_ENTRE_CORREOS * 60 * 1000);
  const reciente = await prisma.tokenRecuperacion.findFirst({
    where: {
      id_usuario: usuario.id_usuario,
      tipo: TIPO_TOKEN,
      created_at: { gte: hace },
    },
  });
  if (reciente) return;

  await enviarVerificacion(usuario);
}
