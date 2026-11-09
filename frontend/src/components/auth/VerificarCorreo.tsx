"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, MailCheck } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { mensajeDeError } from "@/lib/errores";

type Estado = "verificando" | "exito" | "error";

export default function VerificarCorreo() {
  const token = useSearchParams().get("token") ?? "";
  const { estaAutenticado } = useAuth();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [mensaje, setMensaje] = useState("");

  // En desarrollo React ejecuta los efectos dos veces: esto evita enviar el token dos veces
  const yaEnviado = useRef(false);

  useEffect(() => {
    if (yaEnviado.current) return;
    yaEnviado.current = true;

    if (!token) {
      setEstado("error");
      setMensaje("El enlace de verificación no es válido.");
      return;
    }

    authService
      .verificarCorreo(token)
      .then((texto) => {
        setEstado("exito");
        setMensaje(texto);
      })
      .catch((err) => {
        setEstado("error");
        setMensaje(
          mensajeDeError(
            err,
            "No se pudo verificar tu correo. Intentá de nuevo.",
          ),
        );
      });
  }, [token]);

  return (
    <div className="card w-full max-w-md p-6 sm:p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
        <MailCheck className="w-6 h-6 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">
        Verificación de correo
      </h1>

      {estado === "verificando" && (
        <p className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando tu correo...
        </p>
      )}

      {estado === "exito" && (
        <div className="space-y-4">
          <div
            role="status"
            className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-left"
          >
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{mensaje}</p>
          </div>
          <Link
            href={estaAutenticado ? "/" : "/login"}
            className="btn-primary w-full flex items-center justify-center py-3"
          >
            {estaAutenticado ? "Ir al inicio" : "Iniciar sesión"}
          </Link>
        </div>
      )}

      {estado === "error" && (
        <div className="space-y-4">
          <div
            role="alert"
            className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-left"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{mensaje}</p>
          </div>
          <p className="text-xs text-gray-500">
            Iniciá sesión: si tu cuenta necesita verificación, ahí podés pedir
            un enlace nuevo.
          </p>
          <Link
            href="/login"
            className="btn-primary w-full flex items-center justify-center py-3"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      )}
    </div>
  );
}
