"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { authService, Desafio2FA } from "@/services/auth.service";
import { mensajeDeError, codigoDeError } from "@/lib/errores";
import { AuthResponse } from "@/types";

interface Paso2FAProps {
  desafio: Desafio2FA;
  onVerificado: (resultado: AuthResponse) => void;
  /** Vuelve al primer paso del login (con un mensaje, si el desafío venció o se agotaron los intentos) */
  onVolver: (mensaje?: string) => void;
}

/** HU-046: el médico ingresa el código que le llegó por correo, o un código de recuperación (CA-2). */
export default function Paso2FA({
  desafio,
  onVerificado,
  onVolver,
}: Paso2FAProps) {
  const [codigo, setCodigo] = useState("");
  const [usarRecuperacion, setUsarRecuperacion] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const limpio = codigo.trim();
    if (!usarRecuperacion && !/^\d{6}$/.test(limpio)) {
      setError("El código tiene 6 dígitos");
      return;
    }
    if (usarRecuperacion && limpio.replace(/[^A-Za-z0-9]/g, "").length !== 10) {
      setError(
        "El código de recuperación tiene 10 caracteres (ej.: ABCDE-FGHJK)",
      );
      return;
    }

    setVerificando(true);
    setError(null);
    try {
      onVerificado(await authService.verificar2FA(desafio.desafio, limpio));
    } catch (err) {
      const mensaje = mensajeDeError(
        err,
        "No se pudo verificar el código. Intentá de nuevo.",
      );
      // CA-4: desafío vencido o intentos agotados → volver a iniciar sesión
      if (codigoDeError(err) === "REINICIAR_LOGIN") {
        onVolver(mensaje);
        return;
      }
      setError(mensaje);
      setCodigo("");
      setVerificando(false);
    }
  }

  function alternarModo() {
    setUsarRecuperacion((v) => !v);
    setCodigo("");
    setError(null);
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
        <ShieldCheck className="w-6 h-6 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">
        Verificación en dos pasos
      </h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        {usarRecuperacion
          ? "Ingresá uno de los códigos de recuperación que guardaste al activar la verificación. Cada uno sirve una sola vez."
          : `Te enviamos un código de 6 dígitos a ${desafio.correo}. Vence en 10 minutos.`}
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="codigo-2fa"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {usarRecuperacion
              ? "Código de recuperación"
              : "Código de verificación"}
          </label>
          <input
            id="codigo-2fa"
            type="text"
            inputMode={usarRecuperacion ? "text" : "numeric"}
            autoComplete={usarRecuperacion ? "off" : "one-time-code"}
            maxLength={usarRecuperacion ? 11 : 6}
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value);
              setError(null);
            }}
            placeholder={usarRecuperacion ? "ABCDE-FGHJK" : "123456"}
            disabled={verificando}
            autoFocus
            className={`input-field text-center text-lg tracking-[0.3em] font-mono ${usarRecuperacion ? "uppercase" : ""}`}
          />
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
          disabled={verificando}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {verificando && <Loader2 className="w-4 h-4 animate-spin" />}
          {verificando ? "Verificando..." : "Verificar"}
        </button>
      </form>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={() => onVolver()}
          disabled={verificando}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-primary disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <button
          type="button"
          onClick={alternarModo}
          disabled={verificando}
          className="text-accent hover:underline text-left sm:text-right disabled:opacity-50"
        >
          {usarRecuperacion
            ? "Usar el código del correo"
            : "¿No te llegó? Usar un código de recuperación"}
        </button>
      </div>
    </div>
  );
}
