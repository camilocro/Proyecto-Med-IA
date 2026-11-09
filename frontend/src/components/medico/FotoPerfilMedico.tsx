'use client'

import { useRef, useState } from 'react'
import { Camera, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import AvatarMedico from '@/components/ui/AvatarMedico'
import ConfirmarDialogo from '@/components/admin/ConfirmarDialogo'
import { medicoPanelService, PerfilMedico } from '@/services/medicoPanel.service'
import { recortarFotoPerfil, validarArchivoFoto } from '@/lib/imagen'
import { mensajeDeError } from '@/lib/errores'

type Aviso = { tipo: 'exito' | 'error'; mensaje: string }

interface FotoPerfilMedicoProps {
  perfil:        PerfilMedico
  onActualizado: (perfil: PerfilMedico) => void
}

/** HU-060: subir, previsualizar y quitar la foto que ven los pacientes en las sugerencias */
export default function FotoPerfilMedico({ perfil, onActualizado }: FotoPerfilMedicoProps) {
  const entrada = useRef<HTMLInputElement>(null)
  const [vistaPrevia,   setVistaPrevia]   = useState<string | null>(null)
  const [procesando,    setProcesando]    = useState(false)
  const [guardando,     setGuardando]     = useState(false)
  const [confirmarQuitar, setConfirmarQuitar] = useState(false)
  const [errorQuitar,   setErrorQuitar]   = useState<string | null>(null)
  const [aviso,         setAviso]         = useState<Aviso | null>(null)

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!archivo) return

    setAviso(null)
    const error = validarArchivoFoto(archivo)
    if (error) {
      setAviso({ tipo: 'error', mensaje: error }) // CA-2: indica el límite
      return
    }

    setProcesando(true)
    try {
      setVistaPrevia(await recortarFotoPerfil(archivo)) // CA-3: recorte cuadrado
    } catch (err) {
      setAviso({ tipo: 'error', mensaje: err instanceof Error ? err.message : 'No se pudo procesar la imagen.' })
    } finally {
      setProcesando(false)
    }
  }

  async function guardar() {
    if (!vistaPrevia) return
    setGuardando(true)
    setAviso(null)
    try {
      onActualizado(await medicoPanelService.actualizarFoto(vistaPrevia))
      setVistaPrevia(null)
      setAviso({ tipo: 'exito', mensaje: 'Tu foto se actualizó. Ya la ven los pacientes en las sugerencias.' })
    } catch (err) {
      setAviso({ tipo: 'error', mensaje: mensajeDeError(err, 'No se pudo guardar la foto. Intentá de nuevo.') })
    } finally {
      setGuardando(false)
    }
  }

  async function quitar() {
    setGuardando(true)
    setErrorQuitar(null)
    try {
      onActualizado(await medicoPanelService.eliminarFoto())
      setConfirmarQuitar(false)
      setAviso({ tipo: 'exito', mensaje: 'Quitaste tu foto. Los pacientes verán la imagen predeterminada.' })
    } catch (err) {
      setErrorQuitar(mensajeDeError(err, 'No se pudo quitar la foto. Intentá de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  const nombre = perfil.usuario.nombre

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <AvatarMedico
          fotoUrl={vistaPrevia ?? perfil.foto_url}
          nombre={nombre}
          className="w-24 h-24 rounded-2xl border border-gray-100"
          sinFoto={
            <div className="w-24 h-24 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Camera className="w-8 h-8 text-primary/60" />
            </div>
          }
        />

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Foto de perfil</h3>
            <p className="text-xs text-gray-400">
              {vistaPrevia
                ? 'Así se verá tu foto. Confirmá para guardarla.'
                : 'JPG o PNG de hasta 2 MB. Se recorta en un cuadrado automáticamente.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {vistaPrevia ? (
              <>
                <button type="button" onClick={guardar} disabled={guardando}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
                  {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar foto
                </button>
                <button type="button" onClick={() => setVistaPrevia(null)} disabled={guardando}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => entrada.current?.click()} disabled={procesando}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-sm font-medium text-primary
                             hover:bg-primary-100/50 transition-colors disabled:opacity-50">
                  {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {perfil.foto_url ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {perfil.foto_url && (
                  <button type="button" onClick={() => { setErrorQuitar(null); setConfirmarQuitar(true) }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600
                               hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    Quitar foto
                  </button>
                )}
              </>
            )}
          </div>
          <input
            ref={entrada}
            id="foto-medico"
            type="file"
            accept="image/jpeg,image/png"
            onChange={alElegirArchivo}
            className="hidden"
          />
        </div>
      </div>

      {aviso && (
        <div
          role={aviso.tipo === 'exito' ? 'status' : 'alert'}
          className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
            aviso.tipo === 'exito' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {aviso.tipo === 'exito' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {aviso.mensaje}
        </div>
      )}

      {/* CA-4: confirmar antes de quitarla */}
      <ConfirmarDialogo
        abierto={confirmarQuitar}
        titulo="Quitar foto de perfil"
        mensaje="Los pacientes verán la imagen predeterminada en lugar de tu foto."
        textoConfirmar="Quitar foto"
        tono="peligro"
        cargando={guardando}
        error={errorQuitar}
        onConfirmar={quitar}
        onCancelar={() => setConfirmarQuitar(false)}
      />
    </div>
  )
}
