'use client'

import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import CampoFormulario, { clasesControl } from './CampoFormulario'
import { especialidadService, EspecialidadAdmin, DatosEspecialidad } from '@/services/especialidad.service'
import { mensajeDeError } from '@/lib/errores'

// Mismas reglas que valida el backend (especialidad.controller.ts)
const MIN_NOMBRE      = 2
const MAX_NOMBRE      = 60
const MIN_DESCRIPCION = 10
const MAX_DESCRIPCION = 300

type Errores = Partial<Record<keyof DatosEspecialidad, string>>

interface EspecialidadFormProps {
  /** Sin especialidad = nueva; con especialidad = edición (HU-023) */
  especialidad?: EspecialidadAdmin
  onGuardada:    (especialidad: EspecialidadAdmin) => void
  onCerrar:      () => void
}

export default function EspecialidadForm({ especialidad, onGuardada, onCerrar }: EspecialidadFormProps) {
  const esEdicion = Boolean(especialidad)
  const [nombre,      setNombre]      = useState(especialidad?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(especialidad?.descripcion ?? '')
  const [errores,     setErrores]     = useState<Errores>({})
  const [error,       setError]       = useState<string | null>(null)
  const [guardando,   setGuardando]   = useState(false)

  function validar(): Errores {
    const e: Errores = {}
    const n = nombre.trim()
    const d = descripcion.trim()
    if (n.length < MIN_NOMBRE || n.length > MAX_NOMBRE) {
      e.nombre = `El nombre debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres.`
    }
    if (d.length < MIN_DESCRIPCION || d.length > MAX_DESCRIPCION) {
      e.descripcion = `La descripción debe tener entre ${MIN_DESCRIPCION} y ${MAX_DESCRIPCION} caracteres.`
    }
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nuevosErrores = validar()
    setErrores(nuevosErrores)
    setError(null)
    if (Object.keys(nuevosErrores).length > 0) return

    const datos: DatosEspecialidad = { nombre: nombre.trim(), descripcion: descripcion.trim() }
    setGuardando(true)
    try {
      if (especialidad) {
        const cambios: Partial<DatosEspecialidad> = {}
        if (datos.nombre !== especialidad.nombre)           cambios.nombre      = datos.nombre
        if (datos.descripcion !== especialidad.descripcion) cambios.descripcion = datos.descripcion
        if (Object.keys(cambios).length === 0) {
          onCerrar()
          return
        }
        onGuardada(await especialidadService.actualizar(especialidad.id_especialidad, cambios))
      } else {
        onGuardada(await especialidadService.crear(datos))
      }
    } catch (err) {
      // HU-023 CA-2: el backend responde 409 con un mensaje claro si el nombre ya existe
      setError(mensajeDeError(err, 'No se pudo guardar la especialidad. Intentá de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo={esEdicion ? 'Editar especialidad' : 'Nueva especialidad'}
      subtitulo="Disponible para asignar médicos y para la derivación de la IA"
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
            form="form-especialidad"
            disabled={guardando}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 px-6"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {esEdicion ? 'Guardar cambios' : 'Crear especialidad'}
          </button>
        </>
      }
    >
      <form id="form-especialidad" onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <CampoFormulario id="especialidad-nombre" etiqueta="Nombre" error={errores.nombre}>
          <input
            id="especialidad-nombre"
            type="text"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: undefined })); setError(null) }}
            placeholder="Ej. Endocrinología"
            maxLength={MAX_NOMBRE}
            disabled={guardando}
            className={clasesControl(Boolean(errores.nombre))}
          />
        </CampoFormulario>

        <CampoFormulario
          id="especialidad-descripcion"
          etiqueta="Descripción"
          error={errores.descripcion}
          ayuda={`${descripcion.trim().length} / ${MAX_DESCRIPCION}`}
        >
          <textarea
            id="especialidad-descripcion"
            rows={3}
            value={descripcion}
            onChange={(e) => { setDescripcion(e.target.value); setErrores((p) => ({ ...p, descripcion: undefined })); setError(null) }}
            placeholder="Qué tipo de síntomas o enfermedades atiende"
            maxLength={MAX_DESCRIPCION}
            disabled={guardando}
            className={`${clasesControl(Boolean(errores.descripcion))} resize-none`}
          />
        </CampoFormulario>
      </form>
    </Modal>
  )
}
