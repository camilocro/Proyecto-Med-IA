import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
} from "../../errors/AppError";
import { SALT_ROUNDS } from "../../constants";
import { signToken } from "../auth/auth.service";
import { enviarCorreo } from "../../shared/correo";
import { plantillaCorreo } from "../../shared/plantillaCorreo";

const SELECT_PERFIL = {
  id_usuario: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  verificado: true,
  created_at: true,
  recibir_correos: true,
  doble_factor: true,
} as const;

export interface CambiosPerfil {
  nombre?: string;
  correo?: string;
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

/** Aviso por correo de un cambio de seguridad en la cuenta (enviarCorreo nunca lanza error). */
async function avisarCambio(
  usuario: { id_usuario: number; nombre: string },
  para: string,
  titulo: string,
  parrafo: string,
): Promise<void> {
  await enviarCorreo({
    para,
    asunto: `Med-IA: ${titulo.toLowerCase()}`,
    html: plantillaCorreo({
      titulo,
      saludo: `Hola, ${usuario.nombre}:`,
      parrafos: [parrafo],
      nota: "Si no hiciste este cambio, recupera el acceso desde «¿Olvidaste tu contraseña?» y avisa al administrador.",
    }),
    tipo: "aviso_seguridad",
    idUsuario: usuario.id_usuario,
  });
}

/**
 * Actualiza nombre, correo, contraseña o preferencias de correo.
 * Cambiar correo o contraseña pide la contraseña actual (HU-043 CA-1/CA-2).
 * Al cambiar la contraseña se cierran las demás sesiones (HU-043 CA-4): sube token_version
 * y se devuelve un token nuevo para que este dispositivo siga conectado.
 */
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
    correo?: string;
    password_hash?: string;
    recibir_correos?: boolean;
    token_version?: { increment: number };
  } = {};

  if (cambios.nombre !== undefined) datos.nombre = cambios.nombre;
  if (cambios.recibirCorreos !== undefined)
    datos.recibir_correos = cambios.recibirCorreos;

  const cambiaCorreo =
    cambios.correo !== undefined && cambios.correo !== usuario.correo;
  const cambiaPassword = cambios.contrasena !== undefined;

  if (cambiaCorreo || cambiaPassword) {
    if (!cambios.contrasenaActual) {
      throw badRequest(
        cambiaPassword
          ? "Ingresa tu contraseña actual para cambiarla"
          : "Ingresa tu contraseña actual para cambiar el correo",
      );
    }
    const actualValida = await bcrypt.compare(
      cambios.contrasenaActual,
      usuario.password_hash,
    );
    // 400 y no 401: el usuario SÍ está autenticado; un 401 hacía que el frontend
    // cerrara la sesión y redirigiera al login al equivocarse de contraseña.
    if (!actualValida) throw badRequest("La contraseña actual es incorrecta");
  }

  if (cambiaCorreo) {
    // HU-005 CA-2: el correo no puede ser de otra cuenta (P2002 también lo cubre si llegan dos a la vez)
    const otra = await prisma.usuario.findUnique({
      where: { correo: cambios.correo },
      select: { id_usuario: true },
    });
    if (otra) throw conflict("El correo ya está registrado en otra cuenta");
    datos.correo = cambios.correo;
  }

  if (cambiaPassword) {
    datos.password_hash = await bcrypt.hash(cambios.contrasena!, SALT_ROUNDS);
    datos.token_version = { increment: 1 };
  }

  const actualizado = await prisma.usuario.update({
    where: { id_usuario: idUsuario },
    data: datos,
    select: { ...SELECT_PERFIL, token_version: true },
  });
  const { token_version, ...perfil } = actualizado;

  if (cambiaCorreo) {
    void avisarCambio(
      usuario,
      usuario.correo, // se avisa a la dirección anterior
      "Tu correo cambió",
      `El correo de tu cuenta de Med-IA ahora es ${perfil.correo}. Desde ahora inicias sesión con esa dirección.`,
    );
  }
  if (cambiaPassword) {
    void avisarCambio(
      usuario,
      perfil.correo,
      "Tu contraseña cambió",
      "La contraseña de tu cuenta de Med-IA se cambió y se cerraron las sesiones abiertas en otros dispositivos.",
    );
    // Token nuevo con la versión actual: este dispositivo sigue conectado, los demás no
    return { ...perfil, token: signToken({ ...perfil, token_version }) };
  }
  return perfil;
}
const NOMBRE_CUENTA_ELIMINADA = "Cuenta eliminada";
const DOMINIO_CUENTA_ELIMINADA = "eliminada.med-ia.invalid"; // .invalid nunca existe

/**
 * HU-048: el paciente elimina su cuenta. Borrado lógico: no se borra ninguna fila.
 * Sus datos personales se reemplazan por valores anónimos (CA-2) y la cuenta queda marcada
 * con eliminado_en; sus consultas se ocultan, pero siguen contando en las estadísticas y en
 * las derivaciones de los médicos, y sus intentos de acceso siguen visibles en Accesos (HU-047).
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

  // El mismo correo anónimo reemplaza al real en todas las tablas que lo guardan
  const correoAnonimo = `eliminada-${idUsuario}@${DOMINIO_CUENTA_ELIMINADA}`;

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
    // CA-2 con borrado lógico: los intentos de acceso (HU-047) y el registro de correos
    // se conservan para auditoría, pero con el correo anonimizado en lugar del real
    prisma.intentoLogin.updateMany({
      where: {
        OR: [{ id_usuario: idUsuario }, { correo_intentado: usuario.correo }],
      },
      data: { correo_intentado: correoAnonimo },
    }),
    prisma.notificacionEmail.updateMany({
      where: {
        OR: [{ id_usuario: idUsuario }, { destinatario: usuario.correo }],
      },
      data: { destinatario: correoAnonimo },
    }),
    prisma.paciente.update({
      where: { id_paciente: usuario.paciente.id_paciente },
      data: { fecha_nacimiento: null },
    }),
    // La fila queda (borrado lógico con eliminado_en), pero sin nombre, correo ni contraseña:
    // ya no identifica a nadie y el correo real queda libre para registrarse de nuevo.
    // token_version cierra todas sus sesiones.
    prisma.usuario.update({
      where: { id_usuario: idUsuario },
      data: {
        nombre: NOMBRE_CUENTA_ELIMINADA,
        correo: correoAnonimo,
        password_hash: "cuenta-eliminada",
        eliminado_en: new Date(),
        activo: false,
        verificado: false,
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
