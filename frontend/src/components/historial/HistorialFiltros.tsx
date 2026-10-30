"use client";

import { Filter, X } from "lucide-react";
import { EstadoConsulta, NivelUrgencia } from "@/types";

export interface FiltrosHistorial {
  especialidad: string; // '' = todas
  urgencia: NivelUrgencia | "";
  estado: EstadoConsulta | "";
  desde: string; // 'YYYY-MM-DD' o ''
  hasta: string;
}

export const FILTROS_VACIOS: FiltrosHistorial = {
  especialidad: "",
  urgencia: "",
  estado: "",
  desde: "",
  hasta: "",
};

const OPCIONES_URGENCIA: { valor: NivelUrgencia; texto: string }[] = [
  { valor: "emergencia", texto: "Emergencia" },
  { valor: "alto", texto: "Alta" },
  { valor: "medio", texto: "Media" },
  { valor: "bajo", texto: "Baja" },
];

const OPCIONES_ESTADO: { valor: EstadoConsulta; texto: string }[] = [
  { valor: "completada", texto: "Completada" },
  { valor: "esperando_respuestas", texto: "Sin terminar" },
  { valor: "cancelada", texto: "Cancelada" },
];

interface HistorialFiltrosProps {
  filtros: FiltrosHistorial;
  especialidades: string[];
  onChange: (filtros: FiltrosHistorial) => void;
}

export default function HistorialFiltros({
  filtros,
  especialidades,
  onChange,
}: HistorialFiltrosProps) {
  const hayFiltros = Object.values(filtros).some((valor) => valor !== "");

  function actualizar<K extends keyof FiltrosHistorial>(
    campo: K,
    valor: FiltrosHistorial[K],
  ) {
    onChange({ ...filtros, [campo]: valor });
  }

  return (
    <div className="card p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-primary" />
          Filtrar consultas
        </p>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => onChange(FILTROS_VACIOS)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label
            htmlFor="filtro-especialidad"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Especialidad
          </label>
          <select
            id="filtro-especialidad"
            value={filtros.especialidad}
            onChange={(e) => actualizar("especialidad", e.target.value)}
            className="input-field py-2"
          >
            <option value="">Todas</option>
            {especialidades.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filtro-urgencia"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Urgencia
          </label>
          <select
            id="filtro-urgencia"
            value={filtros.urgencia}
            onChange={(e) =>
              actualizar("urgencia", e.target.value as NivelUrgencia | "")
            }
            className="input-field py-2"
          >
            <option value="">Todas</option>
            {OPCIONES_URGENCIA.map(({ valor, texto }) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filtro-estado"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Estado
          </label>
          <select
            id="filtro-estado"
            value={filtros.estado}
            onChange={(e) =>
              actualizar("estado", e.target.value as EstadoConsulta | "")
            }
            className="input-field py-2"
          >
            <option value="">Todos</option>
            {OPCIONES_ESTADO.map(({ valor, texto }) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="filtro-desde"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Desde
          </label>
          <input
            id="filtro-desde"
            type="date"
            value={filtros.desde}
            max={filtros.hasta || undefined}
            onChange={(e) => actualizar("desde", e.target.value)}
            className="input-field py-2"
          />
        </div>
        <div>
          <label
            htmlFor="filtro-hasta"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            Hasta
          </label>
          <input
            id="filtro-hasta"
            type="date"
            value={filtros.hasta}
            min={filtros.desde || undefined}
            onChange={(e) => actualizar("hasta", e.target.value)}
            className="input-field py-2"
          />
        </div>
      </div>
    </div>
  );
}
