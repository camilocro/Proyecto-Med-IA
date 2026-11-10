"use client";

import { useState } from "react";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { perfilService, PerfilUsuario } from "@/services/perfil.service";
import { mensajeDeError } from "@/lib/errores";

interface PreferenciasCorreoProps {
  recibirCorreos: boolean;
  onActualizado: (perfil: PerfilUsuario) => void;
}

/** HU-070 CA-4: el paciente decide si recibe por correo el resumen de sus consultas. */
export default function PreferenciasCorreo({
  recibirCorreos,
  onActualizado,
}: PreferenciasCorreoProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alternar() {
    setGuardando(true);
    setError(null);
    try {
      const actualizado = await perfilService.actualizarPerfil({
        recibir_correos: !recibirCorreos,
      });
      onActualizado(actualizado);
    } catch (err) {
      setError(
        mensajeDeError(
          err,
          "No se pudo guardar tu preferencia. Intentá de nuevo.",
        ),
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8">
      <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1">
        <Mail className="w-5 h-5 text-primary" />
        Notificaciones por correo
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Elegí si querés recibir el resumen de cada consulta en tu correo.
      </p>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p
            id="etiqueta-recibir-correos"
            className="text-sm font-medium text-gray-800"
          >
            Recibir correos de mis consultas
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Especialidad, urgencia y médicos recomendados. Nunca tus síntomas.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={recibirCorreos}
          aria-labelledby="etiqueta-recibir-correos"
          onClick={alternar}
          disabled={guardando}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                      disabled:opacity-60 disabled:cursor-not-allowed
                      ${recibirCorreos ? "bg-green-500" : "bg-gray-300"}`}
        >
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform
                        ${recibirCorreos ? "translate-x-6" : "translate-x-1"}`}
          >
            {guardando && (
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
            )}
          </span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mt-4"
        >
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
