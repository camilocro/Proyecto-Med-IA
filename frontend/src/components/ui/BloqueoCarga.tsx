"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { suscribirCarga } from "@/lib/cargaGlobal";

const ESPERA_AVISO_MS = 400; // si la operación es rápida, no se muestra el aviso

/** Capa transparente que bloquea los clics mientras se guarda, envía o elimina algo. */
export default function BloqueoCarga() {
  const [activo, setActivo] = useState(false);
  const [mostrarAviso, setMostrarAviso] = useState(false);

  useEffect(
    () => suscribirCarga((pendientes) => setActivo(pendientes > 0)),
    [],
  );

  useEffect(() => {
    if (!activo) {
      setMostrarAviso(false);
      return;
    }
    const espera = setTimeout(() => setMostrarAviso(true), ESPERA_AVISO_MS);
    return () => clearTimeout(espera);
  }, [activo]);

  if (!activo) return null;

  return (
    <div className="fixed inset-0 z-[100] cursor-wait" aria-busy="true">
      {mostrarAviso && (
        <div
          role="status"
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white border border-gray-100
                     shadow-lg rounded-full px-4 py-2 text-sm text-gray-700"
        >
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          Procesando…
        </div>
      )}
    </div>
  );
}
