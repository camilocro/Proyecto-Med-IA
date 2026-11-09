import { Request, Response } from "express";
import {
  obtenerPerfil,
  actualizarPerfil,
  eliminarCuenta,
  CambiosPerfil,
} from "./usuario.service";
import { ok, AuthenticatedRequest } from "../../shared/types";
import { badRequest } from "../../errors/AppError";
import {
  MIN_LONGITUD_NOMBRE,
  MAX_LONGITUD_NOMBRE,
  MIN_LONGITUD_PASSWORD,
} from "../../constants";
import { cambiarDobleFactor } from "../auth/dobleFactor.service";

function validarCambios(body: unknown): CambiosPerfil {
  const { nombre, contrasena, contrasena_actual, recibir_correos } = (body ??
    {}) as Record<string, unknown>;
  const cambios: CambiosPerfil = {};

  if (nombre !== undefined) {
    if (typeof nombre !== "string") throw badRequest("El nombre no es válido");
    const limpio = nombre.trim();
    if (
      limpio.length < MIN_LONGITUD_NOMBRE ||
      limpio.length > MAX_LONGITUD_NOMBRE
    ) {
      throw badRequest(
        `El nombre debe tener entre ${MIN_LONGITUD_NOMBRE} y ${MAX_LONGITUD_NOMBRE} caracteres`,
      );
    }
    cambios.nombre = limpio;
  }

  if (contrasena !== undefined) {
    if (
      typeof contrasena !== "string" ||
      contrasena.length < MIN_LONGITUD_PASSWORD
    ) {
      throw badRequest(
        `La nueva contraseña debe tener al menos ${MIN_LONGITUD_PASSWORD} caracteres`,
      );
    }
    if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
      throw badRequest(
        "La nueva contraseña debe tener al menos una letra y un número",
      );
    }
    cambios.contrasena = contrasena;
    cambios.contrasenaActual =
      typeof contrasena_actual === "string" ? contrasena_actual : undefined;
  }

  if (recibir_correos !== undefined) {
    if (typeof recibir_correos !== "boolean") {
      throw badRequest('El campo "recibir_correos" debe ser true o false');
    }
    cambios.recibirCorreos = recibir_correos;
  }

  if (
    cambios.nombre === undefined &&
    cambios.contrasena === undefined &&
    cambios.recibirCorreos === undefined
  ) {
    throw badRequest(
      "Envía al menos un campo para actualizar: nombre, contrasena o recibir_correos",
    );
  }
  return cambios;
}

export async function miPerfil(req: Request, res: Response) {
  const { id_usuario } = (req as AuthenticatedRequest).usuario;
  res.json(ok(await obtenerPerfil(id_usuario)));
}

export async function editarPerfil(req: Request, res: Response) {
  const { id_usuario } = (req as AuthenticatedRequest).usuario;
  const cambios = validarCambios(req.body);
  res.json(ok(await actualizarPerfil(id_usuario, cambios)));
}
/** HU-048: pide la contraseña para confirmar que es el dueño de la cuenta (no basta con una sesión abierta). */
export async function eliminarMiCuenta(req: Request, res: Response) {
  const { id_usuario } = (req as AuthenticatedRequest).usuario;
  const { password } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof password !== "string" || !password) {
    throw badRequest("Ingresa tu contraseña para confirmar");
  }

  await eliminarCuenta(id_usuario, password, req.ip ?? "desconocida");
  res.json(ok({ message: "Tu cuenta fue eliminada." }));
}
/** HU-046: el médico activa o desactiva la verificación en dos pasos (pide la contraseña). */
export async function cambiarMiDobleFactor(req: Request, res: Response) {
  const { id_usuario } = (req as AuthenticatedRequest).usuario;
  const { activar, password } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof activar !== "boolean") {
    throw badRequest('El campo "activar" debe ser true o false');
  }
  if (typeof password !== "string" || !password) {
    throw badRequest("Ingresa tu contraseña para confirmar");
  }

  res.json(ok(await cambiarDobleFactor(id_usuario, activar, password)));
}
