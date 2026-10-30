"use client";

import { useState, useMemo } from "react";
import { adminService, UsuarioAdmin } from "@/services/admin.service";
import { Loader2, AlertCircle, Search, X } from "lucide-react";

// ── Constantes ────────────────────────────────────────────────────────────────

const ROL_LABEL: Record<string, string> = {
  administrador: "Administrador",
  medico: "Médico",
  paciente: "Paciente",
};

const ROL_BADGE: Record<string, string> = {
  administrador: "bg-purple-100 text-purple-700",
  medico: "bg-blue-100 text-blue-700",
  paciente: "bg-gray-100 text-gray-600",
};

/** Minúsculas y sin tildes: "José" y "jose" coinciden */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  usuarios: UsuarioAdmin[];
  onUsuariosChange: (usuarios: UsuarioAdmin[]) => void;
}

export default function UsuariosTable({ usuarios, onUsuariosChange }: Props) {
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Filtra en tiempo real por nombre o correo (HU-049)
  const usuariosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return usuarios;
    return usuarios.filter(
      (u) =>
        normalizar(u.nombre).includes(termino) ||
        normalizar(u.correo).includes(termino),
    );
  }, [usuarios, busqueda]);

  async function toggleEstado(usuario: UsuarioAdmin) {
    setCambiando(usuario.id_usuario);
    setError(null);
    try {
      const actualizado = await adminService.cambiarEstadoUsuario(
        usuario.id_usuario,
        !usuario.activo,
      );
      onUsuariosChange(
        usuarios.map((u) =>
          u.id_usuario === actualizado.id_usuario ? actualizado : u,
        ),
      );
    } catch (err) {
      // Antes el botón quedaba bloqueado en "cargando" si la petición fallaba
      const mensaje = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(
        mensaje ??
          `No se pudo cambiar el estado de ${usuario.nombre}. Intentá de nuevo.`,
      );
    } finally {
      setCambiando(null);
    }
  }

  if (usuarios.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p className="text-sm">No hay usuarios registrados.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Buscador (HU-049) */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            aria-label="Buscar usuarios por nombre o correo"
            className="input-field py-2 pl-9 pr-9"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 whitespace-nowrap">
          {usuariosFiltrados.length} de {usuarios.length} usuarios
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 bg-red-50 border-b border-red-200 px-6 py-3"
        >
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Solo la tabla se desliza horizontalmente en el celular */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50">
            <tr className="text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left font-medium">Nombre</th>
              <th className="px-6 py-3 text-left font-medium">Correo</th>
              <th className="px-6 py-3 text-left font-medium">Rol</th>
              <th className="px-6 py-3 text-left font-medium">Estado</th>
              <th className="px-6 py-3 text-center font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuariosFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  No hay usuarios que coincidan con &quot;{busqueda}&quot;.
                </td>
              </tr>
            )}
            {usuariosFiltrados.map((u) => (
              <tr
                key={u.id_usuario}
                className="hover:bg-gray-50/60 transition-colors"
              >
                {/* Nombre */}
                <td className="px-6 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">
                  {u.nombre}
                </td>

                {/* Correo */}
                <td className="px-6 py-4 text-sm text-gray-500">{u.correo}</td>

                {/* Rol */}
                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROL_BADGE[u.rol] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {ROL_LABEL[u.rol] ?? u.rol}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>

                {/* Acción — admins no se pueden desactivar */}
                <td className="px-6 py-4 text-center">
                  {u.rol === "administrador" ? (
                    <span className="text-xs text-gray-300 italic">—</span>
                  ) : (
                    <button
                      onClick={() => toggleEstado(u)}
                      disabled={cambiando === u.id_usuario}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] ${
                          u.activo
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-green-200 text-green-700 hover:bg-green-50"
                        }`}
                    >
                      {cambiando === u.id_usuario ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                      ) : u.activo ? (
                        "Desactivar"
                      ) : (
                        "Activar"
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
