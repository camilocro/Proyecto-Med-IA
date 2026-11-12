"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { UserX, Mail } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";

const CORREO_CONTACTO = "pereirarosadoigor@gmail.com";

/** HU-007: el administrador desactivó la cuenta. Cierra la sesión local y explica qué hacer. */
export default function CuentaDeshabilitadaPage() {
  const { cerrarSesion } = useAuth();
  const sesionCerrada = useRef(false);

  useEffect(() => {
    if (sesionCerrada.current) return;
    sesionCerrada.current = true;
    cerrarSesion();
  }, [cerrarSesion]);

  return (
    <div className="min-h-screen flex flex-col bg-light/30">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="card w-full max-w-md p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <UserX className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Tu cuenta fue deshabilitada
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Un administrador desactivó tu cuenta, por eso no podés ingresar a
            Med-IA.
          </p>
          <p className="text-sm text-gray-500 mt-2 mb-6">
            Si creés que es un error, comunicate con el administrador para que
            la reactive.
          </p>
          <a
            href={`mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent("Med-IA: mi cuenta fue deshabilitada")}`}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
          >
            <Mail className="w-4 h-4" />
            Contactar al administrador
          </a>
          <Link
            href="/"
            className="block mt-4 text-sm text-primary hover:underline"
          >
            Ir al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
