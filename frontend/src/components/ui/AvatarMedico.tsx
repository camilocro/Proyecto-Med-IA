interface AvatarMedicoProps {
  fotoUrl?:  string | null
  nombre:    string
  /** Tamaño y forma, por ejemplo "w-12 h-12 rounded-full" */
  className: string
  /** Lo que se muestra si el médico no tiene foto (HU-060 CA-4: imagen predeterminada) */
  sinFoto:   React.ReactNode
}

/** Foto del médico en tarjetas, detalle y su panel (HU-060) */
export default function AvatarMedico({ fotoUrl, nombre, className, sinFoto }: AvatarMedicoProps) {
  if (!fotoUrl) return <>{sinFoto}</>
  return (
    // La foto es un data URL ya recortado a 256 × 256: next/image no aporta nada aquí
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fotoUrl} alt={`Foto de ${nombre}`} className={`${className} object-cover flex-shrink-0`} />
  )
}
