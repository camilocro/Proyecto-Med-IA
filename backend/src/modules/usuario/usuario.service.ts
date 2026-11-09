import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { badRequest, forbidden, notFound } from "../../errors/AppError";
import { SALT_ROUNDS } from "../../constants";

const SELECT_PERFIL = {
  id_usuario: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  verificado: true,
  created_at: true,
  recibir_correos: true,
} as const;

export interface CambiosPerfil {
  nombre?: string;
  contrasena?: string;
  contrasenaActual?: string;
  recibirCorreos?: boolean;
}

export async function obtenerPerfil(idUsuario: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
    select: SELECT_PERFIL,
  });
  if (!usuario) throw notFound("Usuario");
  return usuario;
}

export async function actualizarPerfil(
  idUsuario: number,
  cambios: CambiosPerfil,
) {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
  });
  if (!usuario) throw notFound("Usuario");

  const datos: {
    nombre?: string;
    password_hash?: string;
    recibir_correos?: boolean;
  } = {};

  if (cambios.nombre !== undefined) datos.nombre = cambios.nombre;
  if (cambios.recibirCorreos !== undefined)
    datos.recibir_correos = cambios.recibirCorreos;

  if (cambios.contrasena !== undefined) {
    // Para cambiar la contraseña hay que confirmar la actual (HU-043 CA-1)
    if (!cambios.contrasenaActual) {
      throw badRequest("Ingresa tu contraseña actual para cambiarla");
    }
    const actualValida = await bcrypt.compare(
      cambios.contrasenaActual,
      usuario.password_hash,
    );
    // 400 y no 401: el usuario SÍ está autenticado; un 401 hacía que el frontend
    // cerrara la sesión y redirigiera al login al equivocarse de contraseña.
    if (!actualValida) throw badRequest("La contraseña actual es incorrecta");

    datos.password_hash = await bcrypt.hash(cambios.contrasena, SALT_ROUNDS);
  }

  return prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: datos,
    select: SELECT_PERFIL,
  });
}
/**
 * HU-048: el paciente elimina su cuenta. Por política de seguridad NO se borra nada de la base
 * (borrado lógico): la cuenta queda marcada con eliminado_en y deja de existir para el usuario.
 * Todo en una transacción: o se aplica todo, o nada.
 */
export async function eliminarCuenta(
  idUsuario: number,
  password: string,
  ip: string,
): Promise<void> {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: idUsuario },
    include: { paciente: true },
  });
  if (!usuario || usuario.eliminado_en) throw notFound("Usuario");
  if (usuario.rol !== "paciente" || !usuario.paciente) {
    throw forbidden(
      "Solo los pacientes pueden eliminar su cuenta desde el perfil",
    );
  }

  // 400 y no 401: un 401 haría que el frontend cerrara la sesión al equivocarse de contraseña
  const passwordValida = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordValida) throw badRequest("La contraseña es incorrecta");

  await prisma.$transaction([
    // Sus consultas dejan de verse en su historial, pero se conservan para auditoría y estadísticas
    prisma.consulta.updateMany({
      where: { id_paciente: usuario.paciente.id_paciente },
      data: { oculta_paciente: true },
    }),
    // Ningún enlace de correo pendiente (recuperar, verificar) puede usarse
    prisma.tokenRecuperacion.updateMany({
      where: { id_usuario: idUsuario, usado: false },
      data: { usado: true },
    }),
    // La cuenta se marca como eliminada; token_version cierra todas sus sesiones
    prisma.usuario.update({
      where: { id_usuario: idUsuario },
      data: {
        eliminado_en: new Date(),
        activo: false,
        recibir_correos: false,
        doble_factor: false,
        token_version: { increment: 1 },
      },
    }),
    prisma.auditoriaAcceso.create({
      data: {
        id_usuario: idUsuario,
        accion: "eliminar_cuenta",
        ip_address: ip,
        exitoso: true,
      },
    }),
  ]);
}
