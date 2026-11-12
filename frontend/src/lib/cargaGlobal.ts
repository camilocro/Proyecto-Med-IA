/**
 * Cuenta las operaciones que modifican datos (POST, PATCH, PUT, DELETE) en curso.
 * Mientras haya alguna, BloqueoCarga cubre la pantalla para que no se pueda hacer clic en otra cosa.
 */
type Oyente = (pendientes: number) => void;

let pendientes = 0;
const oyentes = new Set<Oyente>();

function avisar() {
  oyentes.forEach((oyente) => oyente(pendientes));
}

export function iniciarCarga() {
  pendientes++;
  avisar();
}

export function terminarCarga() {
  pendientes = Math.max(0, pendientes - 1);
  avisar();
}

export function suscribirCarga(oyente: Oyente): () => void {
  oyentes.add(oyente);
  oyente(pendientes);
  return () => {
    oyentes.delete(oyente);
  };
}
