interface CampoFormularioProps {
  id:        string
  etiqueta:  string
  error?:    string
  ayuda?:    string
  children:  React.ReactNode
}

/** Etiqueta + control + mensaje de error persistente (HU-033: se limpia al corregir el campo). */
export default function CampoFormulario({ id, etiqueta, error, ayuda, children }: CampoFormularioProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 mt-1.5 ml-1">{error}</p>
      ) : ayuda ? (
        <p className="text-xs text-gray-400 mt-1.5 ml-1">{ayuda}</p>
      ) : null}
    </div>
  )
}

/** Clases del control según tenga o no error (mismas que .input-field de globals.css). */
export function clasesControl(conError: boolean): string {
  return `input-field ${conError ? 'border-red-300 focus:ring-red-400' : ''}`
}
