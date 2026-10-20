import { useState } from 'react'
import { adminService, UsuarioAdmin } from '@/services/admin.service'
import { UserCheck, UserX, Loader2 } from 'lucide-react'

const ROL_BADGE: Record<string, string> = {
  administrador: 'bg-blue-100 text-blue-700',
  medico:        'bg-green-100 text-green-700',
  paciente:      'bg-gray-100 text-gray-600',
}

const ROL_LABEL: Record<string, string> = {
  administrador: 'Admin',
  medico:        'Médico',
  paciente:      'Paciente',
}

interface Props {
  usuarios:         UsuarioAdmin[]
  onUsuariosChange: (usuarios: UsuarioAdmin[]) => void
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
      <div className="px-6 py-12 text-center text-gray-400">
        <UserX className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No hay usuarios registrados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[580px]">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-6 py-3 text-left font-medium">Nombre</th>
            <th className="px-6 py-3 text-left font-medium">Correo</th>
            <th className="px-6 py-3 text-left font-medium">Rol</th>
            <th className="px-6 py-3 text-left font-medium">Estado</th>
            <th className="px-6 py-3 text-center font-medium">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {usuarios.map((usuario) => (
            <tr key={usuario.id_usuario} className="hover:bg-gray-50/60 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                {usuario.nombre}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {usuario.correo}
              </td>
              <td className="px-6 py-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROL_BADGE[usuario.rol] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ROL_LABEL[usuario.rol] ?? usuario.rol}
                </span>
              </td>
              <td className="px-6 py-4">
                {usuario.activo ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                    <UserCheck className="w-3.5 h-3.5" />
                    Activo
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <UserX className="w-3.5 h-3.5" />
                    Inactivo
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => toggleEstado(usuario)}
                  disabled={cambiando === usuario.id_usuario}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                    usuario.activo
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-green-200 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {cambiando === usuario.id_usuario ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                  ) : usuario.activo ? (
                    'Desactivar'
                  ) : (
                    'Activar'
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}