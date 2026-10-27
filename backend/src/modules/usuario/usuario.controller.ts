import { Request, Response } from "express";
import {
  obtenerPerfil,
  actualizarPerfil,
  CambiosPerfil,
} from "./usuario.service";
import { ok, AuthenticatedRequest } from "../../shared/types";
import { badRequest } from "../../errors/AppError";
import {
  MIN_LONGITUD_NOMBRE,
  MAX_LONGITUD_NOMBRE,
  MIN_LONGITUD_PASSWORD,
} from "../../constants";

function validarCambios(body: unknown): CambiosPerfil {
  const { nombre, contrasena, contrasena_actual } = (body ?? {}) as Record<
    string,
    unknown
  >;
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

  if (cambios.nombre === undefined && cambios.contrasena === undefined) {
    throw badRequest(
      "Envía al menos un campo para actualizar: nombre o contrasena",
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
