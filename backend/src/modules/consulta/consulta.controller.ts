import { Request, Response } from "express";
import {
  getIdPacientePorUsuario,
  crearConsulta,
  obtenerConsulta,
  guardarRespuestas,
  cancelarConsulta,
  obtenerHistorialPaciente,
} from "./consulta.service";
import { ok, AuthenticatedRequest } from "../../shared/types";
import { badRequest, forbidden } from "../../errors/AppError";
import { obtenerIdentificadorAnonimo } from "../../shared/sesion";
import {
  MIN_LONGITUD_DESCRIPCION,
  MAX_LONGITUD_DESCRIPCION,
} from "../../constants";

function validarDescripcion(valor: unknown): string {
  if (typeof valor !== "string" || !valor.trim()) {
    throw badRequest("Describe tus síntomas para iniciar la consulta");
  }
  const descripcion = valor.trim();
  if (descripcion.length < MIN_LONGITUD_DESCRIPCION) {
    throw badRequest(
      `Describe tus síntomas con más detalle (mínimo ${MIN_LONGITUD_DESCRIPCION} caracteres)`,
    );
  }
  if (descripcion.length > MAX_LONGITUD_DESCRIPCION) {
    throw badRequest(
      `La descripción no puede superar los ${MAX_LONGITUD_DESCRIPCION} caracteres`,
    );
  }
  return descripcion;
}

export async function iniciar(req: Request, res: Response) {
  const descripcion = validarDescripcion(req.body?.descripcion_sintomas);
  const usuario = (req as AuthenticatedRequest).usuario;

  let idPaciente: number | undefined;
  if (usuario) {
    idPaciente = await getIdPacientePorUsuario(usuario.id_usuario);
    if (!idPaciente)
      throw forbidden("Solo los pacientes pueden realizar consultas de triage");
  }

  const consulta = await crearConsulta(descripcion, {
    idPaciente,
    sesionAnonimo: idPaciente ? undefined : obtenerIdentificadorAnonimo(req),
    ip: req.ip ?? "desconocida",
  });
  res.status(201).json(ok(consulta));
}

export async function obtener(req: Request, res: Response) {
  const consulta = await obtenerConsulta(parseInt(req.params.id));
  res.json(ok(consulta));
}

export async function responderRonda(req: Request, res: Response) {
  const idConsulta = parseInt(req.params.id);
  const idRonda = parseInt(req.params.idRonda);
  const consulta = await guardarRespuestas(
    idConsulta,
    idRonda,
    req.body.respuestas,
  );
  res.json(ok(consulta));
}

export async function cancelar(req: Request, res: Response) {
  const consulta = await cancelarConsulta(parseInt(req.params.id));
  res.json(ok(consulta));
}

export async function historial(req: Request, res: Response) {
  const usuario = (req as AuthenticatedRequest).usuario;
  const consultas = await obtenerHistorialPaciente(usuario.id_usuario);
  res.json(ok(consultas));
}
