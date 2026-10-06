'use client'

import { useState, useEffect }    from 'react'
import Link                        from 'next/link'
import { triageService }           from '@/services/triage.service'
import { Consulta, NivelUrgencia } from '@/types'
import Navbar                      from '@/components/layout/Navbar'
import Footer                      from '@/components/layout/Footer'
import { Calendar, ChevronRight, ClipboardList, AlertCircle } from 'lucide-react'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ETIQUETA_URGENCIA: Record<NivelUrgencia, { texto: string; clases: string }> = {
  bajo:       { texto: 'Baja',       clases: 'badge-urgencia-bajo'  },
  medio:      { texto: 'Media',      clases: 'badge-urgencia-medio' },
  alto:       { texto: 'Alta',       clases: 'badge-urgencia-alto'  },
  emergencia: { texto: 'Emergencia', clases: 'badge-urgencia-alto'  },
}

const BORDE_URGENCIA: Record<NivelUrgencia, string> = {
  bajo:       'border-l-green-400',
  medio:      'border-l-amber-400',
  alto:       'border-l-red-500',
  emergencia: 'border-l-red-700',
}

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString('es-BO', {
    day:    'numeric',
    month:  'long',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    triageService.obtenerHistorial()
      .then(setConsultas)
      .catch(() => setError('No se pudo cargar el historial. Verificá tu conexión.'))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Cargando historial...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-10">

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-primary">Mi Historial</h1>
            <Link href="/consulta" className="btn-primary text-sm px-4 py-2">
              Nueva consulta
            </Link>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Lista vacía */}
          {!error && consultas.length === 0 && (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aún no tenés consultas</p>
              <p className="text-sm text-gray-400 mt-1 mb-6">
                Realizá tu primera consulta para ver el historial aquí.
              </p>
              <Link href="/consulta" className="btn-primary px-6 py-2.5">
                Iniciar consulta
              </Link>
            </div>
          )}

          {/* Lista de consultas */}
          {consultas.length > 0 && (
            <div className="space-y-3">
              {consultas.map((consulta) => {
                const urgencia = consulta.nivel_urgencia
                const badge    = urgencia ? ETIQUETA_URGENCIA[urgencia] : null
                const borde    = urgencia ? BORDE_URGENCIA[urgencia] : 'border-l-gray-300'

                return (
                  <div
                    key={consulta.id_consulta}
                    className={`card border-l-4 ${borde} p-5`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {consulta.especialidad_sugerida && (
                          <p className="font-semibold text-gray-900 mb-1">
                            {consulta.especialidad_sugerida.nombre}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {consulta.descripcion_sintomas}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatearFecha(consulta.fecha_consulta)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {badge && <span className={badge.clases}>{badge.texto}</span>}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  )
}
