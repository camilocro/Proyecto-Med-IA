"use client";

// Badges y textos de urgencia/estado que comparten el Dashboard, la sección
// Consultas y el historial de un usuario (antes estaban dentro de admin/page.tsx)

// ── Fechas ────────────────────────────────────────────────────────────────────

export function formatearFechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Urgencia ──────────────────────────────────────────────────────────────────

const URGENCIA_CLASES: Record<string, string> = {
  alto: "bg-red-100 text-red-700",
  medio: "bg-amber-100 text-amber-700",
  bajo: "bg-green-100 text-green-700",
  emergencia: "bg-purple-100 text-purple-700",
};

export const URGENCIA_PUNTO: Record<string, string> = {
  alto: "bg-red-500",
  medio: "bg-amber-500",
  bajo: "bg-green-500",
  emergencia: "bg-purple-500",
};

export const URGENCIA_LABEL: Record<string, string> = {
  alto: "Alta",
  medio: "Media",
  bajo: "Baja",
  emergencia: "Emergencia",
};

export function BadgeUrgencia({ nivel }: { nivel: string | null | undefined }) {
  if (!nivel) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
      ${URGENCIA_CLASES[nivel] ?? "bg-gray-100 text-gray-600"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${URGENCIA_PUNTO[nivel] ?? "bg-gray-400"}`}
      />
      {URGENCIA_LABEL[nivel] ?? nivel}
    </span>
  );
}

// ── Estado ────────────────────────────────────────────────────────────────────

export const ESTADO_BADGE: Record<string, { texto: string; clases: string }> = {
  completada: { texto: "Completada", clases: "bg-green-100 text-green-700" },
  cancelada: { texto: "Cancelada", clases: "bg-red-100 text-red-700" },
  esperando_respuestas: {
    texto: "Esperando respuestas",
    clases: "bg-amber-100 text-amber-700",
  },
  // Nuevo estado del Sprint 4 (HU-053): la IA ya decidió y falta que el paciente confirme
  esperando_confirmacion: {
    texto: "Por confirmar",
    clases: "bg-sky-100 text-sky-700",
  },
  en_proceso: { texto: "En proceso", clases: "bg-blue-100 text-blue-700" },
};

export function BadgeEstado({ estado }: { estado: string }) {
  const badge = ESTADO_BADGE[estado] ?? ESTADO_BADGE.en_proceso;
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${badge.clases}`}
    >
      {badge.texto}
    </span>
  );
}
