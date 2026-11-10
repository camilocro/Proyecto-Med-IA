"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import Modal from "@/components/admin/Modal";
import { perfilService } from "@/services/perfil.service";
import { mensajeDeError } from "@/lib/errores";

/** HU-048: el paciente elimina su cuenta confirmando con su contraseña. */
export default function EliminarCuenta() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CA-4: cancelar cierra el modal sin hacer nada
  function cerrar() {
    if (eliminando) return;
    setAbierto(false);
    setPassword("");
    setVerPassword(false);
    setError(null);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Ingresá tu contraseña para confirmar");
      return;
    }

    setEliminando(true);
    setError(null);
    try {
      await perfilService.eliminarCuenta(password);
      // La página de confirmación cierra la sesión local (CA-3)
      router.replace("/cuenta-eliminada");
    } catch (err) {
      setError(
        mensajeDeError(err, "No se pudo eliminar la cuenta. Intentá de nuevo."),
      );
      setEliminando(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-red-200 p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Eliminar mi cuenta
            </h3>
            <p className="text-xs text-gray-400">
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Tu cuenta y tu historial dejarán de estar disponibles y no vas a poder
          volver a ingresar.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="w-full sm:w-auto text-sm font-medium px-5 py-2.5 rounded-xl border border-red-300
                       text-red-600 hover:bg-red-50 transition-colors"
          >
            Eliminar mi cuenta
          </button>
        </div>
      </div>

      <Modal
        abierto={abierto}
        titulo="¿Eliminar tu cuenta?"
        subtitulo="Esta acción no se puede deshacer"
        onCerrar={cerrar}
        bloqueado={eliminando}
        pie={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={cerrar}
              disabled={eliminando}
              className="text-sm font-medium px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700
                         hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-eliminar-cuenta"
              disabled={eliminando}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl
                         bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {eliminando && <Loader2 className="w-4 h-4 animate-spin" />}
              {eliminando ? "Eliminando..." : "Eliminar mi cuenta"}
            </button>
          </div>
        }
      >
        <form
          id="form-eliminar-cuenta"
          onSubmit={confirmar}
          noValidate
          className="space-y-4"
        >
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 space-y-1">
              <p className="font-medium">Al eliminar tu cuenta:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>No vas a poder volver a iniciar sesión</li>
                <li>Tus consultas e historial dejarán de estar disponibles</li>
                <li>Se cerrarán todas tus sesiones abiertas</li>
              </ul>
            </div>
          </div>

          <div>
            <label
              htmlFor="password-eliminar"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Ingresá tu contraseña para confirmar
            </label>
            <div className="relative">
              <input
                id="password-eliminar"
                type={verPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoComplete="current-password"
                disabled={eliminando}
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
    </>
  );
}
