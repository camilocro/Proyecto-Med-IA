"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { perfilService, PerfilUsuario } from "@/services/perfil.service";
import { mensajeDeError } from "@/lib/errores";

// Misma validación que el registro y el backend
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface CambiarCorreoProps {
  correoActual: string;
  onActualizado: (perfil: PerfilUsuario) => void;
}

/** HU-005 CA-2/CA-3: cambiar el correo con el que se inicia sesión (pide la contraseña actual). */
export default function CambiarCorreo({
  correoActual,
  onActualizado,
}: CambiarCorreoProps) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<{
    tipo: "exito" | "error";
    mensaje: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const limpio = correo.trim();

    if (!REGEX_CORREO.test(limpio)) {
      setAlerta({ tipo: "error", mensaje: "Ingresá un correo electrónico válido." });
      return;
    }
    if (limpio.toLowerCase() === correoActual.toLowerCase()) {
      setAlerta({ tipo: "error", mensaje: "Es el mismo correo que ya tenés." });
      return;
    }
    if (!contrasena) {
      setAlerta({ tipo: "error", mensaje: "Ingresá tu contraseña actual para confirmar." });
      return;
    }

    setGuardando(true);
    setAlerta(null);
    const actualizado = await perfilService
      .actualizarPerfil({ correo: limpio, contrasena_actual: contrasena })
      .catch((err) => {
        setAlerta({
          tipo: "error",
          mensaje: mensajeDeError(err, "No se pudo cambiar el correo. Intentá de nuevo."),
        });
        return null;
      })
      .finally(() => setGuardando(false));

    if (!actualizado) return;
    onActualizado(actualizado);
    setCorreo("");
    setContrasena("");
    setAlerta({
      tipo: "exito",
      mensaje: `Listo. Desde ahora iniciás sesión con ${actualizado.correo}.`, // CA-3
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
          <Mail className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Cambiar correo
          </h3>
          <p className="text-xs text-gray-400">
            Es el correo con el que iniciás sesión
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="perfil-correo-nuevo"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Nuevo correo
          </label>
          <input
            id="perfil-correo-nuevo"
            type="email"
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              setAlerta(null);
            }}
            placeholder={correoActual}
            className="input-field"
            autoComplete="email"
            maxLength={255}
          />
        </div>

        <div>
          <label
            htmlFor="perfil-correo-password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Contraseña actual
          </label>
          <input
            id="perfil-correo-password"
            type="password"
            value={contrasena}
            onChange={(e) => {
              setContrasena(e.target.value);
              setAlerta(null);
            }}
            placeholder="Para confirmar que sos vos"
            className="input-field"
            autoComplete="current-password"
          />
        </div>

        {alerta && (
          <div
            role={alerta.tipo === "error" ? "alert" : "status"}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
              alerta.tipo === "exito"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {alerta.tipo === "exito" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="break-words min-w-0">{alerta.mensaje}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="btn-primary flex items-center gap-2 py-2.5 px-6"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Cambiar correo
          </button>
        </div>
      </form>
    </div>
  );
}
