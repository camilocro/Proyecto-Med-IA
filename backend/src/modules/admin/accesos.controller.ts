import { Request, Response } from "express";
import { listarAccesos, getDetalleIp } from "./accesos.service";
import { ok } from "../../shared/types";
import { badRequest } from "../../errors/AppError";
import { parsearRangoFechas } from "../../shared/fechas";
import {
  MAX_ACCESOS_POR_PAGINA,
  MAX_ACCESOS_EXPORTACION,
} from "../../constants";

const MAX_LARGO_FILTRO = 100;
const RESULTADOS = ["exitoso", "fallido"] as const;
type Resultado = (typeof RESULTADOS)[number];

function textoOpcional(valor: unknown, nombre: string): string | undefined {
  if (valor === undefined || valor === "") return undefined;
  if (typeof valor !== "string") throw badRequest(`"${nombre}" no es válido`);
  const limpio = valor.trim();
  if (limpio.length > MAX_LARGO_FILTRO)
    throw badRequest(`"${nombre}" es demasiado largo`);
  return limpio || undefined;
}

function enteroOpcional(
  valor: unknown,
  nombre: string,
  porDefecto: number,
  max: number,
): number {
  if (valor === undefined || valor === "") return porDefecto;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > max) {
    throw badRequest(`"${nombre}" debe ser un número entero entre 1 y ${max}`);
  }
  return numero;
}

function resultadoOpcional(valor: unknown): Resultado | undefined {
  if (valor === undefined || valor === "") return undefined;
  if (!RESULTADOS.includes(valor as Resultado))
    throw badRequest('"resultado" debe ser exitoso o fallido');
  return valor as Resultado;
}

/** GET /admin/accesos?usuario&ip&resultado&desde&hasta&pagina&porPagina (HU-047) */
export async function accesos(req: Request, res: Response) {
  const { usuario, ip, resultado, desde, hasta, pagina, porPagina } = req.query;
  const data = await listarAccesos({
    usuario: textoOpcional(usuario, "usuario"),
    ip: textoOpcional(ip, "ip"),
    resultado: resultadoOpcional(resultado),
    fecha: parsearRangoFechas(desde, hasta),
    pagina: enteroOpcional(pagina, "pagina", 1, Number.MAX_SAFE_INTEGER),
    // Exportar CSV pide todas las filas filtradas de una vez, con un tope
    porPagina: enteroOpcional(
      porPagina,
      "porPagina",
      MAX_ACCESOS_POR_PAGINA,
      MAX_ACCESOS_EXPORTACION,
    ),
  });
  res.json(ok(data));
}

/** GET /admin/accesos/ip/:ip (HU-047) */
export async function detalleIp(req: Request, res: Response) {
  const ip = textoOpcional(req.params.ip, "ip");
  if (!ip) throw badRequest("Indica una IP");
  res.json(ok(await getDetalleIp(ip)));
}
