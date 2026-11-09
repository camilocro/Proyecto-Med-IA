"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";

/** HU-048 CA-3: confirma la eliminación y cierra la sesión local. */
export default function CuentaEliminadaPage() {
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
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Tu cuenta fue eliminada
          </h1>
          <p className="text-sm text-gray-500 mt-2 mb-6">
            Tu cuenta y tu historial ya no están disponibles. Gracias por haber
            usado Med-IA.
          </p>
          <Link
            href="/"
            className="btn-primary w-full flex items-center justify-center py-2.5"
          >
            Ir al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
