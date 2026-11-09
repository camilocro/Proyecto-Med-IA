"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { mensajeDeError } from "@/lib/errores";

// Mismas reglas que valida el backend
const MIN_LONGITUD_PASSWORD = 8;

function validarPassword(nueva: string, confirmar: string): string | null {
  if (nueva.length < MIN_LONGITUD_PASSWORD)
    return `La contraseña debe tener al menos ${MIN_LONGITUD_PASSWORD} caracteres`;
  if (!/[A-Za-z]/.test(nueva) || !/\d/.test(nueva))
    return "La contraseña debe tener al menos una letra y un número";
  if (nueva !== confirmar) return "Las contraseñas no coinciden";
  return null;
}

export default function RestablecerForm() {
  const token = useSearchParams().get("token") ?? "";
  const { estaAutenticado, cerrarSesion } = useAuth();

  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errorValidacion = validarPassword(nueva, confirmar);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      setExito(await authService.restablecerPassword(token, nueva));
      // El backend cerró todas las sesiones: si este navegador tenía una, se limpia
      if (estaAutenticado) cerrarSesion();
    } catch (err) {
      setError(
        mensajeDeError(
          err,
          "No se pudo cambiar la contraseña. Intentá de nuevo.",
        ),
      );
    } finally {
      setGuardando(false);
    }
  }

  function limpiarError(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setError(null);
    };
  }

  return (
    <div className="card w-full max-w-md p-6 sm:p-8">
      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
        <KeyRound className="w-6 h-6 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">
        Crear una contraseña nueva
      </h1>

      {!token ? (
        <div className="mt-4 space-y-4">
          <div
            role="alert"
            className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              El enlace no es válido. Pedí uno nuevo desde el inicio de sesión.
            </p>
          </div>
          <Link
            href="/recuperar"
            className="btn-primary w-full flex items-center justify-center py-3"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      ) : exito ? (
        <div className="mt-4 space-y-4">
          <div
            role="status"
            className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4"
          >
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800 space-y-1">
              <p>{exito}</p>
              <p className="text-green-700">
                Por seguridad, se cerraron las sesiones abiertas en otros
                dispositivos.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="btn-primary w-full flex items-center justify-center py-3"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Mínimo {MIN_LONGITUD_PASSWORD} caracteres, con al menos una letra y
            un número.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="password-nueva"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password-nueva"
                  type={verPassword ? "text" : "password"}
                  value={nueva}
                  onChange={limpiarError(setNueva)}
                  autoComplete="new-password"
                  disabled={guardando}
                  className="input-field pl-9 pr-10"
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

            <div>
              <label
                htmlFor="password-confirmar"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password-confirmar"
                  type={verPassword ? "text" : "password"}
                  value={confirmar}
                  onChange={limpiarError(setConfirmar)}
                  autoComplete="new-password"
                  disabled={guardando}
                  className="input-field pl-9"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                {/* CA-2: si el enlace venció o ya se usó, se ofrece pedir otro */}
                {/(enlace)/i.test(error) && (
                  <Link
                    href="/recuperar"
                    className="inline-block text-sm font-medium text-red-700 underline ml-6"
                  >
                    Pedir un enlace nuevo
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
              {guardando ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
