import { Request } from "express";
import { MAX_LONGITUD_SESION_ID } from "../constants";

/** Identifica al paciente anónimo: header x-session-id o, si no llega, la IP. */
export function obtenerIdentificadorAnonimo(req: Request): string {
  const header = req.headers["x-session-id"];
  const sesion =
    typeof header === "string"
      ? header.trim().slice(0, MAX_LONGITUD_SESION_ID)
      : "";
  return sesion || req.ip || "sin-sesion";
}
