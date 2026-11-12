/** Bloque gris que ocupa el lugar del contenido mientras carga. */
export function Esqueleto({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-gray-200 rounded-lg animate-pulse ${className}`}
    />
  );
}

/** Filas de una lista o tabla. */
export function EsqueletoFilas({ filas = 5 }: { filas?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="divide-y divide-gray-50"
    >
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-4">
          <Esqueleto className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Esqueleto className="h-3 w-1/3" />
            <Esqueleto className="h-3 w-1/2" />
          </div>
          <Esqueleto className="h-6 w-16 rounded-full hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Tarjetas de estadísticas. */
export function EsqueletoTarjetas({ cantidad = 2 }: { cantidad?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {Array.from({ length: cantidad }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-100 p-4 space-y-3"
        >
          <Esqueleto className="h-3 w-1/2" />
          <Esqueleto className="h-7 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Pantalla completa (perfil, panel del médico, historial). */
export function EsqueletoPagina() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6"
    >
      <div className="space-y-3">
        <Esqueleto className="h-8 w-56" />
        <Esqueleto className="h-4 w-72 max-w-full" />
      </div>
      <EsqueletoTarjetas cantidad={2} />
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <EsqueletoFilas filas={4} />
      </div>
    </div>
  );
}
