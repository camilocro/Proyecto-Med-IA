"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";

interface CancelarConsultaProps {
  onConfirmar: () => Promise<void>;
  deshabilitado: boolean;
}

export default function CancelarConsulta({
  onConfirmar,
  deshabilitado,
}: CancelarConsultaProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  async function handleConfirmar() {
    setCancelando(true);
    await onConfirmar().finally(() => setCancelando(false));
    setConfirmando(false);
  }

  if (!confirmando) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={deshabilitado}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle className="w-4 h-4" />
          Cancelar consulta
        </button>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
      <p className="text-sm text-red-700">
        ¿Seguro que querés cancelar? Se perderán las respuestas de esta consulta
        y volverás al inicio. La consulta igual cuenta para tu límite de hoy.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={cancelando}
          className="flex-1 bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg
                     hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {cancelando ? "Cancelando..." : "Sí, cancelar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={cancelando}
          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg
                     hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          No, seguir
        </button>
      </div>
    </div>
  );
}
