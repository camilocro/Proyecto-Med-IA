import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { badRequest, notFound } from "../../errors/AppError";
import { SALT_ROUNDS } from "../../constants";

const SELECT_PERFIL = {
  id_usuario: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  verificado: true,
  created_at: true,
} as const;

export interface CambiosPerfil {
  nombre?: string;
  contrasena?: string;
  contrasenaActual?: string;
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

  const datos: { nombre?: string; password_hash?: string } = {};

  if (cambios.nombre !== undefined) datos.nombre = cambios.nombre;

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
