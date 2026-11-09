import prisma from "../../config/prisma";

const MAX_LARGO_CORREO = 255;

/**
 * HU-047: guarda cada intento de inicio de sesión (exitoso o fallido) en IntentoLogin.
 * Nunca lanza error: si falla el registro, el login sigue funcionando igual.
 */
export async function registrarIntentoLogin(datos: {
  correo: string;
  ip: string;
  exitoso: boolean;
  idUsuario?: number;
}): Promise<void> {
  try {
    // Si el correo pertenece a una cuenta, el intento queda asociado a ella
    const idUsuario =
      datos.idUsuario ??
      (
        await prisma.usuario.findUnique({
          where: { correo: datos.correo },
          select: { id_usuario: true },
        })
      )?.id_usuario;

    await prisma.intentoLogin.create({
      data: {
        id_usuario: idUsuario,
        correo_intentado: datos.correo.slice(0, MAX_LARGO_CORREO),
        ip_address: datos.ip,
        exitoso: datos.exitoso,
      },
    });
  } catch (error) {
    console.error(
      "[Accesos] No se pudo registrar el intento de login:",
      (error as Error).message,
    );
  }
}
