"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  Copy,
  Download,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import Modal from "@/components/admin/Modal";
import { perfilService } from "@/services/perfil.service";
import { mensajeDeError } from "@/lib/errores";

interface DobleFactorProps {
  activo: boolean;
  onCambio: (activo: boolean) => void;
}

type Paso = "cerrado" | "confirmar" | "codigos";

/** HU-046: el médico activa o desactiva la verificación en dos pasos. */
export default function DobleFactor({ activo, onCambio }: DobleFactorProps) {
  const [paso, setPaso] = useState<Paso>("cerrado");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigos, setCodigos] = useState<string[]>([]);
  const [guardados, setGuardados] = useState(false);
  const [copiado, setCopiado] = useState(false);

  function cerrar() {
    if (guardando) return;
    // Los códigos se muestran una sola vez: solo se cierra cuando confirma que los guardó
    if (paso === "codigos" && !guardados) return;
    setPaso("cerrado");
    setPassword("");
    setVerPassword(false);
    setError(null);
    setCodigos([]);
    setGuardados(false);
    setCopiado(false);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Ingresá tu contraseña para confirmar");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const resultado = await perfilService.cambiarDobleFactor(
        !activo,
        password,
      );
      onCambio(resultado.doble_factor);
      if (resultado.codigosRecuperacion?.length) {
        setCodigos(resultado.codigosRecuperacion);
        setPaso("codigos");
      } else {
        setPaso("cerrado");
        setPassword("");
      }
    } catch (err) {
      setError(
        mensajeDeError(err, "No se pudo guardar el cambio. Intentá de nuevo."),
      );
    } finally {
      setGuardando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigos.join("\n"));
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  function descargar() {
    const contenido = [
      "Med-IA: códigos de recuperación de la verificación en dos pasos",
      "Cada código sirve una sola vez. Guardalos en un lugar seguro.",
      "",
      ...codigos,
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([contenido], { type: "text/plain;charset=utf-8" }),
    );
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "med-ia-codigos-recuperacion.txt";
    enlace.click();
    URL.revokeObjectURL(url);
  }

  const accion = activo ? "Desactivar" : "Activar";

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Verificación en dos pasos
            </h3>
            <p className="text-xs text-gray-400">
              Un código por correo cada vez que inicias sesión
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-gray-600">
            Estado:{" "}
            <span
              className={`font-semibold ${activo ? "text-green-600" : "text-gray-500"}`}
            >
              {activo ? "Activada" : "Desactivada"}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setPaso("confirmar")}
            className={`w-full sm:w-auto text-sm font-medium px-5 py-2.5 rounded-xl transition-colors ${
              activo
                ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                : "btn-primary"
            }`}
          >
            {accion} verificación
          </button>
        </div>
      </div>

      {/* Paso 1: confirmar con la contraseña */}
      <Modal
        abierto={paso === "confirmar"}
        titulo={`${accion} la verificación en dos pasos`}
        subtitulo="Por seguridad, confirmá tu contraseña"
        onCerrar={cerrar}
        bloqueado={guardando}
        pie={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              className="text-sm font-medium px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-doble-factor"
              disabled={guardando}
              className="btn-primary inline-flex items-center justify-center gap-2 text-sm px-5 py-2.5"
            >
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
              {accion}
            </button>
          </div>
        }
      >
        <form
          id="form-doble-factor"
          onSubmit={confirmar}
          noValidate
          className="space-y-4"
        >
          {!activo && (
            <p className="text-sm text-gray-600">
              Cada vez que inicies sesión te enviaremos un código de 6 dígitos a
              tu correo. Además vas a recibir 8 códigos de recuperación para
              cuando no tengas acceso al correo.
            </p>
          )}
          <div>
            <label
              htmlFor="password-2fa"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password-2fa"
                type={verPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoComplete="current-password"
                disabled={guardando}
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={
                  verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {verPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>
      </Modal>

      {/* Paso 2: mostrar los códigos de recuperación UNA sola vez */}
      <Modal
        abierto={paso === "codigos"}
        titulo="Guardá tus códigos de recuperación"
        subtitulo="Esta es la única vez que los vas a ver"
        onCerrar={cerrar}
        bloqueado={!guardados}
        pie={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={cerrar}
              disabled={!guardados}
              className="btn-primary text-sm px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Listo
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Si no tenés acceso a tu correo, podés iniciar sesión con uno de
            estos códigos. Cada uno sirve una sola vez.
          </p>
          <ul className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-200 rounded-xl p-4">
            {codigos.map((codigo) => (
              <li
                key={codigo}
                className="font-mono text-sm text-gray-800 text-center tracking-wider"
              >
                {codigo}
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={copiar}
              className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {copiado ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiado ? "Copiados" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={descargar}
              className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Descargar .txt
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={guardados}
              onChange={(e) => setGuardados(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            Guardé mis códigos en un lugar seguro
          </label>
        </div>
      </Modal>
    </>
  );
}
