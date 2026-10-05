/**
 * Punto único de validación. Es el ÚNICO `if` de todo el código:
 * las demás decisiones se resuelven con polimorfismo.
 */
type ClaseDeError = new (mensaje: string) => Error;

export class Guardia {
  /** Si la condición es falsa, lanza el error que fabrica `crearError`. */
  static verificar(condicion: boolean, crearError: () => Error): void {
    if (!condicion) {
      throw crearError();
    }
  }

  /** Lanza siempre: para operaciones que un tipo de objeto nunca admite. */
  static rechazar(crearError: () => Error): never {
    throw crearError();
  }

  /** Exige un entero mayor que cero (rechaza decimales, NaN, Infinity y no-números). */
  static enteroPositivo(valor: number, descripcion: string, TipoError: ClaseDeError): void {
    Guardia.verificar(
      Number.isInteger(valor) && valor > 0,
      () => new TipoError(`${descripcion} debe ser un entero positivo: ${String(valor)}`),
    );
  }
}

/** Primer elemento de la lista o, si está vacía, el valor por defecto (reemplaza un if/else). */
export function primeroO<T, D>(lista: readonly T[], porDefecto: D): T | D {
  return [...lista, porDefecto][0] as T | D;
}