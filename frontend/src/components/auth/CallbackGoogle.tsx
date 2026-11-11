"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authService, Desafio2FA } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { mensajeDeError } from "@/lib/errores";
import { rutaInicioPorRol } from "@/lib/flujoAuth";
import Paso2FA from "./Paso2FA";

/** Vuelta de Google: canjea el código, pide la sesión de Med-IA y entra según el rol. */
export default function CallbackGoogle() {
  const router = useRouter();
  const params = useSearchParams();
  const { guardarSesion } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [desafio2FA, setDesafio2FA] = useState<Desafio2FA | null>(null);
  const procesado = useRef(false); // el código es de un solo uso: evita canjearlo dos veces

  useEffect(() => {
    if (procesado.current) return;
    procesado.current = true;

    async function completar() {
      // El usuario canceló en Google, o Google/Supabase devolvieron un error
      if (params.get("error")) {
        setError("No se completó el inicio de sesión con Google.");
        return;
      }
      const codigo = params.get("code");
      if (!codigo) {
        setError("El enlace de inicio de sesión no es válido.");
        return;
      }

      const cliente = supabase();
      try {
        const { data, error: errorCanje } =
          await cliente.auth.exchangeCodeForSession(codigo);
        if (errorCanje || !data.session) throw new Error("canje");

        const resultado = await authService.loginGoogle(
          data.session.access_token,
        );
        if ("requiere2FA" in resultado) {
          setDesafio2FA(resultado); // HU-046: el médico con 2FA ingresa el código
          return;
        }
        guardarSesion(resultado.token, resultado.usuario);
        router.replace(rutaInicioPorRol(resultado.usuario.rol));
      } catch (err) {
        setError(
          err instanceof Error && err.message === "canje"
            ? "El enlace de Google venció. Intentá de nuevo."
            : mensajeDeError(err, "No se pudo iniciar sesión con Google."),
        );
      } finally {
        // Ya no se necesita la sesión de Supabase: la sesión de la app es la de Med-IA
        await cliente.auth.signOut({ scope: "local" }).catch(() => undefined);
      }
    }

    completar();
  }, [params, guardarSesion, router]);

  if (desafio2FA) {
    return (
      <Paso2FA
        desafio={desafio2FA}
        onVerificado={(r) => {
          guardarSesion(r.token, r.usuario);
          router.replace(rutaInicioPorRol(r.usuario.rol));
        }}
        onVolver={() => router.replace("/login")}
      />
    );
  }

  return (
    <div className="card w-full max-w-md p-6 sm:p-8 text-center">
      {error ? (
        <>
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            No pudimos iniciar tu sesión
          </h1>
          <p className="text-sm text-gray-500 mt-2 mb-6">{error}</p>
          <Link
            href="/login"
            className="btn-primary w-full flex items-center justify-center py-2.5"
          >
            Volver a iniciar sesión
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">
            Iniciando sesión con Google...
          </p>
        </>
      )}
    </div>
  );
}
