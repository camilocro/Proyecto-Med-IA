"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { adminService, ConfiguracionSistema } from "@/services/admin.service";
import { mensajeDeError } from "@/lib/errores";
import CampoFormulario, { clasesControl } from "./CampoFormulario";

const CLAVE_LIMITE_DIARIO = "limite_consultas_diarias";
const LIMITE_POR_DEFECTO = 5; // el que usa el backend si no hay valor guardado
const LIMITE_MINIMO = 1;
const LIMITE_MAXIMO = 100; // mismo tope que valida el backend

function validarLimite(texto: string): string | null {
  if (!texto.trim()) return "Ingresá un número";
  const numero = Number(texto);
  if (!Number.isInteger(numero)) return "Debe ser un número entero";
  if (numero < LIMITE_MINIMO || numero > LIMITE_MAXIMO) {
    return `Debe estar entre ${LIMITE_MINIMO} y ${LIMITE_MAXIMO}`;
  }
  return null;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-BO", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConfiguracionPanel() {
  const [guardado, setGuardado] = useState<ConfiguracionSistema | null>(null);
  const [valor, setValor] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const lista = await adminService.getConfiguracion();
      const limite = lista.find((c) => c.clave === CLAVE_LIMITE_DIARIO) ?? null;
      setGuardado(limite);
      setValor(limite?.valor ?? String(LIMITE_POR_DEFECTO));
    } catch (err) {
      setErrorCarga(
        mensajeDeError(
          err,
          "No se pudo cargar la configuración. Intentá de nuevo.",
        ),
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const errorValidacion = validarLimite(valor);
  const sinCambios = guardado !== null && guardado.valor === valor.trim();
  const puedeGuardar = !errorValidacion && !sinCambios && !guardando;

  function handleCambio(nuevoValor: string) {
    setValor(nuevoValor);
    setExito(false);
    setErrorGuardar(null);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeGuardar) return;

    setGuardando(true);
    setErrorGuardar(null);
    setExito(false);
    try {
      const actualizado = await adminService.actualizarConfiguracion(
        CLAVE_LIMITE_DIARIO,
        String(Number(valor)), // normaliza "05" → "5"
      );
      setGuardado(actualizado);
      setValor(actualizado.valor);
      setExito(true);
    } catch (err) {
      setErrorGuardar(
        mensajeDeError(err, "No se pudo guardar el cambio. Intentá de nuevo."),
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Configuración del sistema
        </h2>
      </div>

      <div className="p-6">
        {cargando ? (
          <div className="space-y-3 animate-pulse max-w-md">
            <div className="h-4 bg-gray-200 rounded w-48" />
            <div className="h-11 bg-gray-200 rounded-xl w-40" />
            <div className="h-10 bg-gray-200 rounded-xl w-32" />
          </div>
        ) : errorCarga ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorCarga}</p>
            </div>
            <button
              type="button"
              onClick={cargar}
              className="text-sm font-medium text-red-700 hover:underline flex-shrink-0"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleGuardar}
            className="space-y-5 max-w-md"
            noValidate
          >
            <CampoFormulario
              id="limite-diario"
              etiqueta="Límite de consultas diarias por paciente"
              error={!sinCambios ? (errorValidacion ?? undefined) : undefined}
              ayuda={`Aplica a pacientes registrados y anónimos. Entre ${LIMITE_MINIMO} y ${LIMITE_MAXIMO}.`}
            >
              <input
                id="limite-diario"
                type="number"
                inputMode="numeric"
                min={LIMITE_MINIMO}
                max={LIMITE_MAXIMO}
                step={1}
                value={valor}
                onChange={(e) => handleCambio(e.target.value)}
                disabled={guardando}
                aria-describedby={
                  errorValidacion ? "limite-diario-error" : undefined
                }
                className={`${clasesControl(!sinCambios && Boolean(errorValidacion))} max-w-[10rem]`}
              />
            </CampoFormulario>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                El cambio rige de inmediato. Las consultas que cada paciente ya
                hizo hoy siguen contando: si bajás el límite por debajo de esa
                cantidad, podrá volver a consultar mañana.
              </p>
            </div>

            {errorGuardar && (
              <div
                role="alert"
                className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{errorGuardar}</p>
              </div>
            )}

            {exito && guardado && (
              <div
                role="status"
                className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">
                  Límite actualizado a{" "}
                  <span className="font-semibold">{guardado.valor}</span>{" "}
                  consultas por día.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="submit"
                disabled={!puedeGuardar}
                className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"
              >
                {guardando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              {guardado ? (
                <p className="text-xs text-gray-400">
                  Última modificación: {formatearFecha(guardado.updated_at)}
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  Sin valor guardado: se usa {LIMITE_POR_DEFECTO} por defecto.
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
