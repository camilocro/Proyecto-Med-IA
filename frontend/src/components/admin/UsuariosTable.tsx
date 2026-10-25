'use client'

import { useState } from 'react'
import { adminService, UsuarioAdmin } from '@/services/admin.service'
import { Loader2 } from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  medico:        'Médico',
  paciente:      'Paciente',
}

const ROL_BADGE: Record<string, string> = {
  administrador: 'bg-purple-100 text-purple-700',
  medico:        'bg-blue-100 text-blue-700',
  paciente:      'bg-gray-100 text-gray-600',
}

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  usuarios:          UsuarioAdmin[]
  onUsuariosChange:  (usuarios: UsuarioAdmin[]) => void
}

export default function UsuariosTable({ usuarios, onUsuariosChange }: Props) {
  const [cambiando, setCambiando] = useState<number | null>(null)

  async function toggleEstado(usuario: UsuarioAdmin) {
    setCambiando(usuario.id_usuario)
    const actualizado = await adminService.cambiarEstadoUsuario(
      usuario.id_usuario,
      !usuario.activo,
    )
    onUsuariosChange(
      usuarios.map((u) => (u.id_usuario === actualizado.id_usuario ? actualizado : u)),
    )
    setCambiando(null)
  }

  if (usuarios.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p className="text-sm">No hay usuarios registrados.</p>
      </div>
    )
  }

  return (
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
          {usuarios.map((u) => (
            <tr key={u.id_usuario} className="hover:bg-gray-50/60 transition-colors">

              {/* Nombre */}
              <td className="px-6 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">
                {u.nombre}
              </td>

              {/* Correo */}
              <td className="px-6 py-4 text-sm text-gray-500">{u.correo}</td>

              {/* Rol */}
              <td className="px-6 py-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROL_BADGE[u.rol] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ROL_LABEL[u.rol] ?? u.rol}
                </span>
              </td>

              {/* Estado */}
              <td className="px-6 py-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>

              {/* Acción — admins no se pueden desactivar */}
              <td className="px-6 py-4 text-center">
                {u.rol === 'administrador' ? (
                  <span className="text-xs text-gray-300 italic">—</span>
                ) : (
                  <button
                    onClick={() => toggleEstado(u)}
                    disabled={cambiando === u.id_usuario}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] ${
                        u.activo
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-green-200 text-green-700 hover:bg-green-50'
                      }`}
                  >
                    {cambiando === u.id_usuario ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                    ) : u.activo ? (
                      'Desactivar'
                    ) : (
                      'Activar'
                    )}
                  </button>
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
