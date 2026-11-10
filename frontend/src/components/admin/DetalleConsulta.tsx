'use client'

import { ConsultaDetalleAdmin } from '@/services/admin.service'
import { BadgeEstado, BadgeUrgencia } from './BadgesConsulta'
import { fechaHoraLegible } from '@/lib/exportar'
import { MessageSquare, Stethoscope, User, ListChecks } from 'lucide-react'

function Bloque({ icono: Icono, titulo, children }: {
  icono:    React.ElementType
  titulo:   string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        <Icono className="w-3.5 h-3.5" />
        {titulo}
      </h3>
      {children}
    </section>
  )
}

interface DetalleConsultaProps {
  consulta: ConsultaDetalleAdmin
  /** En el historial de un usuario ya se sabe quién es: se omite la cabecera */
  conCabecera?: boolean
  /** El paciente que ve su propia consulta no necesita su nombre en la cabecera */
  mostrarPaciente?: boolean
}

/** Todo lo que pasó en una consulta, para auditoría y soporte (HU-026 CA-1) */
export default function DetalleConsulta({ consulta, conCabecera = true, mostrarPaciente = true }: DetalleConsultaProps) {
  const preguntas = consulta.rondas.flatMap((ronda) =>
    ronda.preguntas.map((p) => ({ ...p, ronda: ronda.numero_ronda })),
  )

  return (
    <div className="space-y-5">
      {conCabecera && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {mostrarPaciente && (
            <span className="flex items-center gap-1.5 font-semibold text-gray-800">
              <User className="w-4 h-4 text-gray-400" />
              {consulta.paciente?.usuario.nombre ?? 'Anónimo'}
            </span>
          )}
          <span className="text-gray-400">{fechaHoraLegible(consulta.fecha_consulta)}</span>
          <span className="flex items-center gap-2 sm:ml-auto">
            <BadgeUrgencia nivel={consulta.nivel_urgencia} />
            <BadgeEstado estado={consulta.estado} />
          </span>
        </div>
      )}

      <Bloque icono={MessageSquare} titulo="Síntomas descritos">
        <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-xl px-4 py-3">
          {consulta.descripcion_sintomas}
        </p>
        {consulta.resumen_sintomas && (
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-medium">Resumen de la IA:</span> {consulta.resumen_sintomas}
          </p>
        )}
        {consulta.sintomas_extraidos.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-2">
            {consulta.sintomas_extraidos.map((s, i) => (
              <li key={i} className="text-xs bg-primary-100 text-primary px-2.5 py-1 rounded-full">
                {s.descripcion}
                {s.zona_cuerpo ? ` · ${s.zona_cuerpo}` : ''}
                {s.duracion_estimada ? ` · ${s.duracion_estimada}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      {preguntas.length > 0 && (
        <Bloque icono={ListChecks} titulo="Preguntas de la IA">
          <ol className="space-y-2">
            {preguntas.map((p) => (
              <li key={p.id_pr} className="text-sm border-l-2 border-primary/30 pl-3">
                <p className="text-gray-500">
                  <span className="text-xs text-gray-400">Ronda {p.ronda} · </span>
                  {p.pregunta}
                </p>
                <p className="text-gray-800 font-medium">{p.respuesta || <span className="text-gray-400 italic">Sin respuesta</span>}</p>
              </li>
            ))}
          </ol>
        </Bloque>
      )}

      <Bloque icono={Stethoscope} titulo="Resultado">
        {consulta.especialidad_sugerida ? (
          <div className="text-sm space-y-1">
            <p>
              <span className="text-gray-500">Especialidad sugerida: </span>
              <span className="font-semibold text-gray-800">{consulta.especialidad_sugerida.nombre}</span>
            </p>
            {consulta.motivo_derivacion && <p className="text-gray-600">{consulta.motivo_derivacion}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-400">La consulta no llegó a un resultado.</p>
        )}

        {consulta.medicos_sugeridos.length > 0 && (
          <ul className="mt-3 divide-y divide-gray-100 border border-gray-100 rounded-xl">
            {consulta.medicos_sugeridos.map(({ medico }) => (
              <li key={medico.id_medico} className="px-4 py-2.5 text-sm flex flex-wrap justify-between gap-x-4">
                <span className="font-medium text-gray-800">{medico.usuario.nombre}</span>
                <span className="text-gray-500">{medico.especialidad.nombre} · {medico.centro_salud.nombre}</span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  )
}
