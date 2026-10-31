'use client'

import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import CampoFormulario, { clasesControl } from './CampoFormulario'
import {
  medicoService,
  MedicoAdmin,
  MedicoCreado,
  DatosMedico,
  CentroSaludResumen,
} from '@/services/medico.service'
import { EspecialidadAdmin } from '@/services/especialidad.service'
import { mensajeDeError } from '@/lib/errores'

// Mismas reglas que valida el backend (medico.controller.ts)
const REGEX_CORREO       = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const REGEX_TELEFONO     = /^\+?[0-9\s-]+$/
const MIN_NOMBRE         = 2
const MAX_NOMBRE         = 100
const MIN_DESCRIPCION    = 10
const MAX_DESCRIPCION    = 500
const MIN_TELEFONO       = 7
const MAX_TELEFONO       = 15

type Campo   = 'nombre' | 'correo' | 'id_especialidad' | 'id_centro_salud' | 'descripcion_profesional' | 'telefono_contacto'
type Errores = Partial<Record<Campo, string>>

interface Formulario {
  nombre:                  string
  correo:                  string
  id_especialidad:         string
  id_centro_salud:         string
  descripcion_profesional: string
  telefono_contacto:       string
}

function formularioInicial(medico?: MedicoAdmin): Formulario {
  return {
    nombre:                  medico?.usuario.nombre ?? '',
    correo:                  medico?.usuario.correo ?? '',
    id_especialidad:         medico ? String(medico.id_especialidad) : '',
    id_centro_salud:         medico ? String(medico.id_centro_salud) : '',
    descripcion_profesional: medico?.descripcion_profesional ?? '',
    telefono_contacto:       medico?.telefono_contacto ?? '',
  }
}

function validar(f: Formulario): Errores {
  const errores: Errores = {}
  const nombre      = f.nombre.trim()
  const correo      = f.correo.trim()
  const descripcion = f.descripcion_profesional.trim()
  const telefono    = f.telefono_contacto.trim()

  if (nombre.length < MIN_NOMBRE || nombre.length > MAX_NOMBRE) {
    errores.nombre = `Ingresá el nombre completo (${MIN_NOMBRE} a ${MAX_NOMBRE} caracteres).`
  }
  if (!correo)                         errores.correo = 'Ingresá el correo del médico.'
  else if (!REGEX_CORREO.test(correo)) errores.correo = 'Ingresá un correo válido (ej. nombre@correo.com).'

  if (!f.id_especialidad) errores.id_especialidad = 'Seleccioná la especialidad del médico.' // HU-018 CA-2
  if (!f.id_centro_salud) errores.id_centro_salud = 'Seleccioná el centro de salud.'

  if (descripcion.length < MIN_DESCRIPCION || descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion_profesional = `La descripción debe tener entre ${MIN_DESCRIPCION} y ${MAX_DESCRIPCION} caracteres.`
  }
  if (telefono.length < MIN_TELEFONO || telefono.length > MAX_TELEFONO) {
    errores.telefono_contacto = `El teléfono debe tener entre ${MIN_TELEFONO} y ${MAX_TELEFONO} caracteres.`
  } else if (!REGEX_TELEFONO.test(telefono)) {
    errores.telefono_contacto = 'Usá solo números, espacios, guiones y "+".'
  }
  return errores
}

function aDatos(f: Formulario): DatosMedico {
  return {
    nombre:                  f.nombre.trim(),
    correo:                  f.correo.trim(),
    id_especialidad:         Number(f.id_especialidad),
    id_centro_salud:         Number(f.id_centro_salud),
    descripcion_profesional: f.descripcion_profesional.trim(),
    telefono_contacto:       f.telefono_contacto.trim(),
  }
}

/** En edición solo se envía lo que cambió */
function soloCambios(nuevo: DatosMedico, original: DatosMedico): Partial<DatosMedico> {
  const cambios: Partial<DatosMedico> = {}
  ;(Object.keys(nuevo) as (keyof DatosMedico)[]).forEach((clave) => {
    if (nuevo[clave] !== original[clave]) (cambios as Record<string, unknown>)[clave] = nuevo[clave]
  })
  return cambios
}

// ── Componente ────────────────────────────────────────────────────────────────

interface MedicoFormProps {
  /** Sin médico = registro nuevo (HU-018); con médico = edición (HU-019) */
  medico?:        MedicoAdmin
  especialidades: EspecialidadAdmin[]
  centros:        CentroSaludResumen[]
  onCreado:       (resultado: MedicoCreado) => void
  onActualizado:  (medico: MedicoAdmin) => void
  onCerrar:       () => void
}

export default function MedicoForm({ medico, especialidades, centros, onCreado, onActualizado, onCerrar }: MedicoFormProps) {
  const esEdicion = Boolean(medico)
  const [form,      setForm]      = useState<Formulario>(() => formularioInicial(medico))
  const [errores,   setErrores]   = useState<Errores>({})
  const [error,     setError]     = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Si el médico tiene una especialidad ya desactivada, se muestra para no perder el valor actual
  const especialidadActualInactiva =
    medico && !especialidades.some((e) => e.id_especialidad === medico.id_especialidad)
      ? medico.especialidad
      : null

  function cambiar(campo: Campo, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: undefined }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nuevosErrores = validar(form)
    setErrores(nuevosErrores)
    setError(null)
    if (Object.keys(nuevosErrores).length > 0) return

    const datos = aDatos(form)
    setGuardando(true)
    try {
      if (medico) {
        const cambios = soloCambios(datos, aDatos(formularioInicial(medico)))
        if (Object.keys(cambios).length === 0) {
          onCerrar()
          return
        }
        onActualizado(await medicoService.actualizar(medico.id_medico, cambios))
      } else {
        onCreado(await medicoService.crear(datos))
      }
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el médico. Intentá de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo={esEdicion ? 'Editar médico' : 'Registrar médico'}
      subtitulo={esEdicion ? medico?.usuario.nombre : 'Queda disponible para las sugerencias del triage'}
      onCerrar={onCerrar}
      bloqueado={guardando}
      pie={
        <>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700
                       hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-medico"
            disabled={guardando}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 px-6"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {esEdicion ? 'Guardar cambios' : 'Registrar médico'}
          </button>
        </>
      }
    >
      <form id="form-medico" onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <CampoFormulario id="medico-nombre" etiqueta="Nombre completo" error={errores.nombre}>
          <input
            id="medico-nombre"
            type="text"
            value={form.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            placeholder="Ej. Dra. Ana Rojas"
            maxLength={MAX_NOMBRE}
            disabled={guardando}
            className={clasesControl(Boolean(errores.nombre))}
          />
        </CampoFormulario>

        <CampoFormulario id="medico-correo" etiqueta="Correo electrónico" error={errores.correo}>
          <input
            id="medico-correo"
            type="email"
            value={form.correo}
            onChange={(e) => cambiar('correo', e.target.value)}
            placeholder="nombre@med-ia.bo"
            disabled={guardando}
            className={clasesControl(Boolean(errores.correo))}
          />
        </CampoFormulario>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoFormulario id="medico-especialidad" etiqueta="Especialidad" error={errores.id_especialidad}>
            <select
              id="medico-especialidad"
              value={form.id_especialidad}
              onChange={(e) => cambiar('id_especialidad', e.target.value)}
              disabled={guardando}
              className={clasesControl(Boolean(errores.id_especialidad))}
            >
              <option value="">Seleccioná…</option>
              {especialidadActualInactiva && (
                <option value={especialidadActualInactiva.id_especialidad}>
                  {especialidadActualInactiva.nombre} (desactivada)
                </option>
              )}
              {especialidades.map((e) => (
                <option key={e.id_especialidad} value={e.id_especialidad}>{e.nombre}</option>
              ))}
            </select>
          </CampoFormulario>

          <CampoFormulario id="medico-centro" etiqueta="Centro de salud" error={errores.id_centro_salud}>
            <select
              id="medico-centro"
              value={form.id_centro_salud}
              onChange={(e) => cambiar('id_centro_salud', e.target.value)}
              disabled={guardando}
              className={clasesControl(Boolean(errores.id_centro_salud))}
            >
              <option value="">Seleccioná…</option>
              {centros.map((c) => (
                <option key={c.id_centro_salud} value={c.id_centro_salud}>{c.nombre}</option>
              ))}
            </select>
          </CampoFormulario>
        </div>

        <CampoFormulario id="medico-telefono" etiqueta="Teléfono de contacto" error={errores.telefono_contacto}>
          <input
            id="medico-telefono"
            type="tel"
            value={form.telefono_contacto}
            onChange={(e) => cambiar('telefono_contacto', e.target.value)}
            placeholder="Ej. 70000000"
            maxLength={MAX_TELEFONO}
            disabled={guardando}
            className={clasesControl(Boolean(errores.telefono_contacto))}
          />
        </CampoFormulario>

        <CampoFormulario
          id="medico-descripcion"
          etiqueta="Descripción profesional"
          error={errores.descripcion_profesional}
          ayuda={`${form.descripcion_profesional.trim().length} / ${MAX_DESCRIPCION}`}
        >
          <textarea
            id="medico-descripcion"
            rows={3}
            value={form.descripcion_profesional}
            onChange={(e) => cambiar('descripcion_profesional', e.target.value)}
            placeholder="Experiencia, áreas de atención…"
            maxLength={MAX_DESCRIPCION}
            disabled={guardando}
            className={`${clasesControl(Boolean(errores.descripcion_profesional))} resize-none`}
          />
        </CampoFormulario>

        {!esEdicion && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            Al registrarlo se genera una contraseña temporal que verás una sola vez para entregársela al médico.
          </p>
        )}
      </form>
    </Modal>
  )
}
