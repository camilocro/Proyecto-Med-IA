'use client'

import { useState }                from 'react'
import { Consulta, RondaPreguntas } from '@/types'
import { triageService }            from '@/services/triage.service'
import Navbar                       from '@/components/layout/Navbar'
import Footer                       from '@/components/layout/Footer'
import SintomasForm                 from '@/components/triage/SintomasForm'
import PreguntasIA                  from '@/components/triage/PreguntasIA'
import ResultadoTriage              from '@/components/triage/ResultadoTriage'
import { AlertCircle }              from 'lucide-react'

// ─── Tipos locales ─────────────────────────────────────────────────────────────

type EtapaConsulta = 'sintomas' | 'preguntas' | 'resultado'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function obtenerRondaActiva(consulta: Consulta): RondaPreguntas | null {
  if (!consulta.rondas?.length) return null
  return consulta.rondas[consulta.rondas.length - 1]
}

function determinarEtapa(consulta: Consulta): EtapaConsulta {
  if (consulta.estado === 'completada')           return 'resultado'
  if (consulta.estado === 'esperando_respuestas') return 'preguntas'
  return 'sintomas'
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ConsultaPage() {
  const [etapa,               setEtapa]              = useState<EtapaConsulta>('sintomas')
  const [consulta,            setConsulta]           = useState<Consulta | null>(null)
  const [descripcionOriginal, setDescripcionOriginal] = useState('')
  const [cargando,            setCargando]           = useState(false)
  const [error,               setError]              = useState<string | null>(null)
  const [consultasRestantes,  setConsultasRestantes] = useState(5)

  async function handleIniciarConsulta(descripcion: string) {
    setCargando(true)
    setError(null)

    const resultado = await triageService.iniciarConsulta(descripcion)
      .catch((err) => {
        setError(err.response?.data?.message ?? 'Error al iniciar la consulta. Intentá de nuevo.')
        return null
      })
      .finally(() => setCargando(false))

    if (!resultado) return

    setDescripcionOriginal(descripcion)
    setConsulta(resultado)
    setConsultasRestantes((prev) => prev - 1)
    setEtapa(determinarEtapa(resultado))
  }

  async function handleResponderRonda(respuestas: { id_pr: number; respuesta: string }[]) {
    if (!consulta) return
    const rondaActiva = obtenerRondaActiva(consulta)
    if (!rondaActiva) return

    setCargando(true)
    setError(null)

    const resultado = await triageService.responderRonda(
      consulta.id_consulta,
      rondaActiva.id_ronda,
      respuestas,
    ).catch((err) => {
      setError(err.response?.data?.message ?? 'Error al enviar las respuestas. Intentá de nuevo.')
      return null
    }).finally(() => setCargando(false))

    if (!resultado) return
    setConsulta(resultado)
    setEtapa(determinarEtapa(resultado))
  }

  function handleNuevaConsulta() {
    setEtapa('sintomas')
    setConsulta(null)
    setDescripcionOriginal('')
    setError(null)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const TITULOS: Record<EtapaConsulta, string> = {
    sintomas:  '¿Cómo te sentís hoy?',
    preguntas: 'Un par de preguntas más',
    resultado: 'Resultado de tu consulta',
  }

  const SUBTITULOS: Record<EtapaConsulta, string> = {
    sintomas:  'Describí tus síntomas en lenguaje natural, sin necesidad de términos médicos.',
    preguntas: 'Necesitamos un poco más de información para orientarte mejor.',
    resultado: 'Basándonos en lo que describiste, esto es lo que encontramos.',
  }

  const PASOS: EtapaConsulta[] = ['sintomas', 'preguntas', 'resultado']
  const indiceActual = PASOS.indexOf(etapa)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-10">

          {/* Indicador de progreso */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {PASOS.map((paso, index) => (
              <div key={paso} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    index < indiceActual
                      ? 'bg-green-500 text-white'
                      : index === indiceActual
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index < indiceActual ? '✓' : index + 1}
                </div>
                {index < PASOS.length - 1 && (
                  <div className={`w-12 h-0.5 ${index < indiceActual ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Encabezado */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary">{TITULOS[etapa]}</h1>
            <p className="text-gray-500 mt-2">{SUBTITULOS[etapa]}</p>
          </div>

          {/* Error global */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Contenido según etapa */}
          <div className="card p-6">
            {etapa === 'sintomas' && (
              <SintomasForm
                onSubmit={handleIniciarConsulta}
                cargando={cargando}
                consultasRestantes={consultasRestantes}
              />
            )}
            {etapa === 'preguntas' && consulta && obtenerRondaActiva(consulta) && (
              <PreguntasIA
                descripcionOriginal={descripcionOriginal}
                ronda={obtenerRondaActiva(consulta)!}
                numeroRonda={obtenerRondaActiva(consulta)!.numero_ronda}
                cargando={cargando}
                onResponder={handleResponderRonda}
              />
            )}
            {etapa === 'resultado' && consulta && (
              <ResultadoTriage
                consulta={consulta}
                onNuevaConsulta={handleNuevaConsulta}
              />
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
