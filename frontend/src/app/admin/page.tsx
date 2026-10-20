'use client'

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { useAuth }             from '@/hooks/useAuth'
import {
  adminService,
  DashboardMetrics,
  ConsultaReciente,
} from '@/services/admin.service'
import StatsCard from '@/components/admin/StatsCard'
import Navbar    from '@/components/layout/Navbar'
import {
  ClipboardList,
  AlertTriangle,
  UserCheck,
  Users,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react'


function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-BO', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

const CLASES_URGENCIA: Record<string, string> = {
  alto:       'badge-urgencia-alto',
  medio:      'badge-urgencia-medio',
  bajo:       'badge-urgencia-bajo',
  emergencia: 'bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full',
}

const ETIQUETAS_URGENCIA: Record<string, string> = {
  alto: 'Alto', medio: 'Medio', bajo: 'Bajo', emergencia: 'Emergencia',
}

function BadgeUrgencia({ nivel }: { nivel: string | null }) {
  if (!nivel) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className={CLASES_URGENCIA[nivel] ?? 'badge-urgencia-bajo'}>
      {ETIQUETAS_URGENCIA[nivel] ?? nivel}
    </span>
  )
}

interface EstadoPagina {
  metricas:    DashboardMetrics | null
  consultas:   ConsultaReciente[]
  cargando:    boolean
  error:       string | null
  actualizado: Date | null
}

const ESTADO_INICIAL: EstadoPagina = {
  metricas:    null,
  consultas:   [],
  cargando:    true,
  error:       null,
  actualizado: null,
}

export default function AdminPage() {
  const { usuario, cargando: cargandoAuth, esAdmin } = useAuth()
  const router = useRouter()

  const [estado, setEstado] = useState<EstadoPagina>(ESTADO_INICIAL)

  useEffect(() => {
    if (!cargandoAuth && (!usuario || !esAdmin)) {
      router.replace('/')
    }
  }, [cargandoAuth, usuario, esAdmin, router])

  async function cargarDatos() {
    setEstado((prev) => ({ ...prev, cargando: true, error: null }))

    const [metricas, consultas] = await Promise.all([
      adminService.getDashboard(),
      adminService.getConsultasRecientes(),
    ])

    setEstado({
      metricas,
      consultas,
      cargando:    false,
      error:       null,
      actualizado: new Date(),
    })
  }

  useEffect(() => {
    if (!cargandoAuth && esAdmin) {
      cargarDatos()
    }
  }, [cargandoAuth, esAdmin])

  if (cargandoAuth) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Verificando acceso...</p>
          </div>
        </main>
        <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
          Med-IA © {new Date().getFullYear()} — Sistema de Triaje Clínico
        </footer>
      </div>
    )
  }

  if (!esAdmin) return null

  const { metricas, consultas, cargando, error, actualizado } = estado

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administrador</h1>
              <p className="text-sm text-gray-500">
                {actualizado
                  ? `Actualizado: ${actualizado.toLocaleTimeString('es-BO')}`
                  : 'Estadísticas del sistema en tiempo real'}
              </p>
            </div>
          </div>

          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="flex items-center gap-2 btn-outline text-sm px-4 py-2 self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Error al cargar datos</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
              <button
                onClick={cargarDatos}
                className="text-sm text-red-700 underline mt-1 hover:no-underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Tarjetas de métricas */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatsCard
            titulo="Consultas hoy"
            valor={metricas?.consultasHoy ?? 0}
            icono={ClipboardList}
            color="azul"
            cargando={cargando && !metricas}
          />
          <StatsCard
            titulo="Urgencias altas hoy"
            valor={metricas?.urgenciasAltas ?? 0}
            icono={AlertTriangle}
            color="rojo"
            cargando={cargando && !metricas}
          />
          <StatsCard
            titulo="Médicos activos"
            valor={metricas?.medicosActivos ?? 0}
            icono={UserCheck}
            color="verde"
            cargando={cargando && !metricas}
          />
          <StatsCard
            titulo="Usuarios registrados"
            valor={metricas?.usuariosRegistrados ?? 0}
            icono={Users}
            color="amarillo"
            cargando={cargando && !metricas}
          />
        </section>

        {/* Consultas recientes */}
        <section className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-800">Consultas recientes</h2>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              Últimas {consultas.length}
            </span>
          </div>

          {cargando && consultas.length === 0 ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded flex-1" />
                  <div className="h-6 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
              ))}
            </div>
          ) : consultas.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay consultas registradas todavía.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Paciente</th>
                    <th className="px-6 py-3 text-left font-medium">Síntomas</th>
                    <th className="px-6 py-3 text-left font-medium">Urgencia</th>
                    <th className="px-6 py-3 text-left font-medium">Especialidad</th>
                    <th className="px-6 py-3 text-left font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {consultas.map((consulta) => (
                    <tr
                      key={consulta.id_consulta}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                        {consulta.paciente?.usuario?.nombre ?? 'Anónimo'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[220px]">
                        <span className="truncate block">
                          {consulta.descripcion_sintomas.length > 60
                            ? `${consulta.descripcion_sintomas.slice(0, 60)}…`
                            : consulta.descripcion_sintomas}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <BadgeUrgencia nivel={consulta.nivel_urgencia} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {consulta.especialidad_sugerida?.nombre ?? (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          {formatearFecha(consulta.fecha_consulta)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>

      <footer className="mt-auto py-6 text-center text-xs text-gray-400 border-t border-gray-100">
        Med-IA © {new Date().getFullYear()} — Sistema de Triaje Clínico
      </footer>
    </div>
  )
}