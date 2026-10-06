import { Request, Response } from "express";
import {
  getIdPacientePorUsuario,
  crearConsulta,
  obtenerConsulta,
  guardarRespuestas,
  cancelarConsulta,
  obtenerHistorialPaciente,
  Solicitante,
  RespuestaRonda,
} from "./consulta.service";
import { ok, AuthenticatedRequest } from "../../shared/types";
import { badRequest, forbidden } from "../../errors/AppError";
import { obtenerIdentificadorAnonimo } from "../../shared/sesion";
import {
  MIN_LONGITUD_DESCRIPCION,
  MAX_LONGITUD_DESCRIPCION,
  MAX_LONGITUD_RESPUESTA,
} from "../../constants";

// ─── Validaciones de entrada ──────────────────────────────────────────────────

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

function validarRespuestas(valor: unknown): RespuestaRonda[] {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw badRequest("Envía las respuestas de la ronda");
  }
  return valor.map((r) => {
    const id_pr = Number(r?.id_pr);
    const respuesta =
      typeof r?.respuesta === "string" ? r.respuesta.trim() : "";

    if (!Number.isInteger(id_pr))
      throw badRequest("Cada respuesta debe indicar el id_pr de su pregunta");
    if (!respuesta) throw badRequest("Debes responder todas las preguntas");
    if (respuesta.length > MAX_LONGITUD_RESPUESTA) {
      throw badRequest(
        `Cada respuesta puede tener como máximo ${MAX_LONGITUD_RESPUESTA} caracteres`,
      );
    }
    return { id_pr, respuesta };
  });
}

function parsearId(valor: string, nombre: string): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`${nombre} inválido`);
  return id;
}

/** Quién hace la petición: paciente registrado, sesión anónima y si es admin. */
async function obtenerSolicitante(req: Request): Promise<Solicitante> {
  const usuario = (req as AuthenticatedRequest).usuario;
  return {
    idPaciente: usuario
      ? await getIdPacientePorUsuario(usuario.id_usuario)
      : undefined,
    sesionAnonimo: obtenerIdentificadorAnonimo(req),
    esAdmin: usuario?.rol === "administrador",
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

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
  const idConsulta = parsearId(req.params.id, "ID de consulta");
  const consulta = await obtenerConsulta(
    idConsulta,
    await obtenerSolicitante(req),
  );
  res.json(ok(consulta));
}

export async function responderRonda(req: Request, res: Response) {
  const idConsulta = parsearId(req.params.id, "ID de consulta");
  const idRonda = parsearId(req.params.idRonda, "ID de ronda");
  const respuestas = validarRespuestas(req.body?.respuestas);

  const consulta = await guardarRespuestas(
    idConsulta,
    idRonda,
    respuestas,
    await obtenerSolicitante(req),
  );
  res.json(ok(consulta));
}

export async function cancelar(req: Request, res: Response) {
  const idConsulta = parsearId(req.params.id, "ID de consulta");
  const consulta = await cancelarConsulta(
    idConsulta,
    await obtenerSolicitante(req),
  );
  res.json(ok(consulta));
}

export async function historial(req: Request, res: Response) {
  const usuario = (req as AuthenticatedRequest).usuario;
  const consultas = await obtenerHistorialPaciente(usuario.id_usuario);
  res.json(ok(consultas));
}
