import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import {
  AppError,
  badRequest,
  forbidden,
  notFound,
} from "../../errors/AppError";
import {
  MINUTOS_VIGENCIA_CODIGO_2FA,
  MAX_INTENTOS_2FA,
  CANTIDAD_CODIGOS_RECUPERACION,
} from "../../constants";
import { enviarCorreo } from "../../shared/correo";
import { plantillaCorreo } from "../../shared/plantillaCorreo";
import { generarToken, hashToken, esTokenValido } from "../../shared/tokens";

const TIPO_DESAFIO = "desafio_2fa";
const TIPO_RECUPERACION = "recuperacion_2fa";

const ANIOS_VIGENCIA_CODIGOS_RECUPERACION = 10;
// Sin 0/O ni 1/I para que no se confundan al copiarlos a mano. 32 letras: sin sesgo con bytes aleatorios
const ALFABETO_RECUPERACION = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LARGO_CODIGO_RECUPERACION = 10;

/** Con este código el frontend sabe que debe volver al primer paso del login. */
export const CODIGO_REINICIAR_LOGIN = "REINICIAR_LOGIN";
const MENSAJE_DESAFIO_INVALIDO =
  "El código venció o ya no es válido. Inicia sesión de nuevo.";

export interface Desafio2FA {
  requiere2FA: true;
  desafio: string;
  correo: string; // enmascarado: a***@gmail.com
}

function secreto(): string {
  const valor = process.env.JWT_SECRET;
  if (!valor) throw new Error("JWT_SECRET no definido");
  return valor;
}

/**
 * El código de 6 dígitos se calcula a partir del desafío con una clave secreta (HMAC):
 * no se guarda en ninguna parte, así que leer la base no permite obtenerlo.
 */
function codigoDelDesafio(desafio: string): string {
  const hmac = crypto
    .createHmac("sha256", secreto())
    .update(`codigo-2fa:${desafio}`)
    .digest();
  return (hmac.readUInt32BE(0) % 1_000_000).toString().padStart(6, "0");
}

/** Comparación en tiempo constante: no deja deducir el código midiendo cuánto tarda la respuesta. */
function sonIguales(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return (
    bufferA.length === bufferB.length &&
    crypto.timingSafeEqual(bufferA, bufferB)
  );
}

function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.split("@");
  return `${usuario.slice(0, 1)}***@${dominio}`;
}

function generarCodigoRecuperacion(): string {
  const letras = Array.from(
    crypto.randomBytes(LARGO_CODIGO_RECUPERACION),
    (byte) => ALFABETO_RECUPERACION[byte % ALFABETO_RECUPERACION.length],
  ).join("");
  return `${letras.slice(0, 5)}-${letras.slice(5)}`;
}

/** "abcde-fghij", "ABCDE FGHIJ" y "ABCDEFGHIJ" son el mismo código. */
function normalizarCodigoRecuperacion(codigo: string): string {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ─── Login en dos pasos ───────────────────────────────────────────────────────

/** Paso 1: crea el desafío y envía el código por correo. Anula los desafíos anteriores. */
export async function iniciarDesafio2FA(usuario: {
  id_usuario: number;
  nombre: string;
  correo: string;
}): Promise<Desafio2FA> {
  const desafio = generarToken();

  await prisma.$transaction([
    prisma.tokenRecuperacion.updateMany({
      where: {
        id_usuario: usuario.id_usuario,
        tipo: TIPO_DESAFIO,
        usado: false,
      },
      data: { usado: true },
    }),
    prisma.tokenRecuperacion.create({
      data: {
        id_usuario: usuario.id_usuario,
        tipo: TIPO_DESAFIO,
        token: hashToken(desafio),
        expira_en: new Date(
          Date.now() + MINUTOS_VIGENCIA_CODIGO_2FA * 60 * 1000,
        ),
      },
    }),
  ]);

  const html = plantillaCorreo({
    titulo: "Tu código para iniciar sesión",
    saludo: `Hola, ${usuario.nombre}:`,
    parrafos: [
      "Usa este código para terminar de iniciar sesión en Med-IA.",
      `Vence en ${MINUTOS_VIGENCIA_CODIGO_2FA} minutos.`,
    ],
    codigo: codigoDelDesafio(desafio),
    nota: "Si no intentaste iniciar sesión, cambia tu contraseña: alguien más la conoce.",
  });

  await enviarCorreo({
    para: usuario.correo,
    asunto: "Med-IA: código para iniciar sesión",
    html,
    tipo: "codigo_2fa",
    idUsuario: usuario.id_usuario,
  });

  return {
    requiere2FA: true,
    desafio,
    correo: enmascararCorreo(usuario.correo),
  };
}

/**
 * Paso 2: valida el código de 6 dígitos (o un código de recuperación, CA-2).
 * Máximo 3 intentos por desafío (CA-4). Devuelve el id del usuario si es correcto.
 */
export async function verificarDesafio2FA(
  desafio: unknown,
  codigo: unknown,
): Promise<number> {
  if (!esTokenValido(desafio)) {
    throw new AppError(MENSAJE_DESAFIO_INVALIDO, 400, CODIGO_REINICIAR_LOGIN);
  }

  const registro = await prisma.tokenRecuperacion.findUnique({
    where: { token: hashToken(desafio) },
  });
  if (
    !registro ||
    registro.tipo !== TIPO_DESAFIO ||
    registro.usado ||
    registro.expira_en < new Date()
  ) {
    throw new AppError(MENSAJE_DESAFIO_INVALIDO, 400, CODIGO_REINICIAR_LOGIN);
  }

  const ingresado = typeof codigo === "string" ? codigo.trim() : "";
  let valido = false;
  let idCodigoRecuperacion: number | null = null;

  if (/^\d{6}$/.test(ingresado)) {
    valido = sonIguales(ingresado, codigoDelDesafio(desafio));
  } else {
    const normalizado = normalizarCodigoRecuperacion(ingresado);
    if (normalizado.length === LARGO_CODIGO_RECUPERACION) {
      const recuperacion = await prisma.tokenRecuperacion.findFirst({
        where: {
          token: hashToken(normalizado),
          tipo: TIPO_RECUPERACION,
          id_usuario: registro.id_usuario,
          usado: false,
        },
      });
      if (recuperacion) {
        valido = true;
        idCodigoRecuperacion = recuperacion.id;
      }
    }
  }

  if (!valido) {
    // increment es atómico: dos intentos simultáneos no pueden saltarse el límite
    const actualizado = await prisma.tokenRecuperacion.update({
      where: { id: registro.id },
      data: { intentos: { increment: 1 } },
    });
    const restantes = MAX_INTENTOS_2FA - actualizado.intentos;
    if (restantes <= 0) {
      await prisma.tokenRecuperacion.update({
        where: { id: registro.id },
        data: { usado: true },
      });
      throw new AppError(
        `Superaste los ${MAX_INTENTOS_2FA} intentos. Inicia sesión de nuevo.`,
        400,
        CODIGO_REINICIAR_LOGIN,
      );
    }
    throw badRequest(
      `Código incorrecto. Te ${restantes === 1 ? "queda 1 intento" : `quedan ${restantes} intentos`}.`,
    );
  }

  // El desafío se usa una sola vez: si llegan dos envíos a la vez, solo uno pasa
  const { count } = await prisma.tokenRecuperacion.updateMany({
    where: { id: registro.id, usado: false },
    data: { usado: true },
  });
  if (count === 0)
    throw new AppError(MENSAJE_DESAFIO_INVALIDO, 400, CODIGO_REINICIAR_LOGIN);

  if (idCodigoRecuperacion !== null) {
    await prisma.tokenRecuperacion.update({
      where: { id: idCodigoRecuperacion },
      data: { usado: true },
    });
  }
  return registro.id_usuario;
}

// ─── Activar o desactivar desde el perfil ─────────────────────────────────────

/**
 * HU-046: el médico activa o desactiva la verificación en dos pasos, confirmando su contraseña.
 * Al activarla se generan 8 códigos de recuperación nuevos: se devuelven UNA sola vez
 * y en la base solo queda su hash. Activar de nuevo los reemplaza.
 */
export async function cambiarDobleFactor(
  idUsuario: number,
  activar: boolean,
  password: string,
): Promise<{ doble_factor: boolean; codigosRecuperacion?: string[] }> {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
  });
  if (!usuario) throw notFound("Usuario");
  if (usuario.rol !== "medico")
    throw forbidden(
      "La verificación en dos pasos está disponible para médicos",
    );

  // 400 y no 401: un 401 haría que el frontend cerrara la sesión al equivocarse de contraseña
  if (!(await bcrypt.compare(password, usuario.password_hash))) {
    throw badRequest("La contraseña es incorrecta");
  }

  const anularCodigosAnteriores = prisma.tokenRecuperacion.updateMany({
    where: { id_usuario: idUsuario, tipo: TIPO_RECUPERACION, usado: false },
    data: { usado: true },
  });

  if (!activar) {
    await prisma.$transaction([
      anularCodigosAnteriores,
      prisma.usuario.update({
        where: { id_usuario: idUsuario },
        data: { doble_factor: false },
      }),
    ]);
    return { doble_factor: false };
  }

  const codigos = Array.from(
    { length: CANTIDAD_CODIGOS_RECUPERACION },
    generarCodigoRecuperacion,
  );
  const expira = new Date();
  expira.setFullYear(
    expira.getFullYear() + ANIOS_VIGENCIA_CODIGOS_RECUPERACION,
  );

  await prisma.$transaction([
    anularCodigosAnteriores,
    prisma.tokenRecuperacion.createMany({
      data: codigos.map((codigo) => ({
        id_usuario: idUsuario,
        tipo: TIPO_RECUPERACION,
        token: hashToken(normalizarCodigoRecuperacion(codigo)),
        expira_en: expira,
      })),
    }),
    prisma.usuario.update({
      where: { id_usuario: idUsuario },
      data: { doble_factor: true },
    }),
  ]);

  return { doble_factor: true, codigosRecuperacion: codigos };
}
