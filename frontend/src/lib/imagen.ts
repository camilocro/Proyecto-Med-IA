// Foto de perfil del médico (HU-060): se valida, se recorta y se reduce en el navegador,
// así al backend solo llega una imagen pequeña y cuadrada.

export const MAX_BYTES_ORIGINAL = 2 * 1024 * 1024 // CA-1: JPG o PNG de hasta 2 MB
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png']
const LADO_FOTO = 256 // CA-3: formato estándar, cuadrado de 256 × 256
const MAX_BYTES_RESULTADO = 60 * 1024 // un poco menos que el límite del backend (64 KB)
const CALIDADES_JPEG = [0.85, 0.7, 0.55]

/** Devuelve el mensaje de error o null si el archivo es válido (CA-1, CA-2) */
export function validarArchivoFoto(archivo: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) return 'La foto debe ser una imagen JPG o PNG.'
  if (archivo.size > MAX_BYTES_ORIGINAL) {
    return `La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB. El máximo es 2 MB.`
  }
  return null
}

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagen = new Image()
    imagen.onload = () => resolve(imagen)
    imagen.onerror = () => reject(new Error('No se pudo leer la imagen. Probá con otro archivo.'))
    imagen.src = url
  })
}

/** Tamaño real de un data URL en base64 */
function bytesDeDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
}

/** Recorta el centro en un cuadrado de 256 × 256 y lo devuelve como JPEG (data URL) */
export async function recortarFotoPerfil(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo)
  try {
    const imagen = await cargarImagen(url)
    const lado = Math.min(imagen.naturalWidth, imagen.naturalHeight)
    const origenX = (imagen.naturalWidth - lado) / 2
    const origenY = (imagen.naturalHeight - lado) / 2

    const canvas = document.createElement('canvas')
    canvas.width = LADO_FOTO
    canvas.height = LADO_FOTO
    const contexto = canvas.getContext('2d')
    if (!contexto) throw new Error('Tu navegador no permite procesar la imagen.')

    // Un PNG con fondo transparente quedaría negro en JPEG: se pinta blanco antes
    contexto.fillStyle = '#ffffff'
    contexto.fillRect(0, 0, LADO_FOTO, LADO_FOTO)
    contexto.drawImage(imagen, origenX, origenY, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO)

    for (const calidad of CALIDADES_JPEG) {
      const dataUrl = canvas.toDataURL('image/jpeg', calidad)
      if (bytesDeDataUrl(dataUrl) <= MAX_BYTES_RESULTADO) return dataUrl
    }
    throw new Error('No se pudo reducir la foto lo suficiente. Probá con otra imagen.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
