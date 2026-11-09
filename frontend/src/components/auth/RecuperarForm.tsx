"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { mensajeDeError } from "@/lib/errores";

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function RecuperarForm() {
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const limpio = correo.trim();
    if (!REGEX_CORREO.test(limpio)) {
      setError("Ingresá un correo electrónico válido");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      setMensaje(await authService.solicitarRecuperacion(limpio));
    } catch (err) {
      setError(
        mensajeDeError(
          err,
          "No pudimos procesar la solicitud. Intentá de nuevo.",
        ),
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card w-full max-w-md p-6 sm:p-8">
      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
        <KeyRound className="w-6 h-6 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">
        ¿Olvidaste tu contraseña?
      </h1>

      {mensaje ? (
        <div className="mt-4 space-y-4">
          <div
            role="status"
            className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4"
          >
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800 space-y-1">
              <p>{mensaje}</p>
              <p className="text-green-700">
                Revisá también la carpeta de spam. El enlace vence en 24 horas.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Ingresá el correo de tu cuenta y te enviaremos un enlace para crear
            una contraseña nueva.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="correo-recuperar"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="correo-recuperar"
                  type="email"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    setError(null);
                  }}
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="email"
                  disabled={enviando}
                  aria-invalid={Boolean(error)}
                  className="input-field pl-9"
                />
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

            <button
              type="submit"
              disabled={enviando}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              {enviando ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        </>
      )}

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio de sesión
      </Link>
    </div>
  );
}
