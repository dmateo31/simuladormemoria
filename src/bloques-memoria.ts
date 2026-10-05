/**
 * Bloques de memoria contigua (RF04, RF05). Libre y ocupado son clases distintas:
 * cada pregunta la responde el bloque según su tipo (polimorfismo), sin `if (bloque.libre)`.
 * Son inmutables: ocupar, liberar o fusionar devuelve bloques nuevos.
 */
import { OperacionMemoriaInvalidaError } from "./errores";
import { Guardia } from "./guardia";

export abstract class BloqueMemoria {
  readonly #inicio: number;
  readonly #tamano: number;

  protected constructor(inicio: number, tamano: number) {
    this.#inicio = inicio;
    this.#tamano = tamano;
  }

  get inicio(): number {
    return this.#inicio;
  }

  get tamano(): number {
    return this.#tamano;
  }

  get fin(): number {
    return this.inicio + this.tamano;
  }

  abstract get pid(): number | null;
  abstract get libre(): boolean;
  abstract puedeAlojar(tamano: number): boolean;
  abstract perteneceA(pid: number): boolean;
  /** Divide el bloque: [ocupado] o [ocupado, resto libre]. */
  abstract ocupar(pid: number, tamano: number): readonly BloqueMemoria[];
  abstract liberar(): BloqueLibre;
  /** Coalescencia por doble despacho: combina este bloque con el siguiente. */
  abstract combinarCon(siguiente: BloqueMemoria): readonly BloqueMemoria[];
  abstract combinarTrasLibre(anterior: BloqueLibre): readonly BloqueMemoria[];
}

export class BloqueLibre extends BloqueMemoria {
  constructor(inicio: number, tamano: number) {
    super(inicio, tamano);
    Object.freeze(this);
  }

  get pid(): null {
    return null;
  }

  get libre(): boolean {
    return true;
  }

  puedeAlojar(tamano: number): boolean {
    return tamano <= this.tamano;
  }

  perteneceA(_pid: number): boolean {
    return false;
  }

  ocupar(pid: number, tamano: number): readonly BloqueMemoria[] {
    // El resto sólo existe si sobra espacio: en un ajuste exacto la lista queda vacía.
    const resto = [this.tamano - tamano]
      .filter((sobrante) => sobrante > 0)
      .map((sobrante) => new BloqueLibre(this.inicio + tamano, sobrante));
    return [new BloqueOcupado(this.inicio, tamano, pid), ...resto];
  }

  liberar(): BloqueLibre {
    return Guardia.rechazar(() => new OperacionMemoriaInvalidaError(`El bloque en ${this.inicio} ya está libre`));
  }

  combinarCon(siguiente: BloqueMemoria): readonly BloqueMemoria[] {
    return siguiente.combinarTrasLibre(this);
  }

  /** Libre seguido de libre: se fusionan. */
  combinarTrasLibre(anterior: BloqueLibre): readonly BloqueMemoria[] {
    return [new BloqueLibre(anterior.inicio, anterior.tamano + this.tamano)];
  }
}

export class BloqueOcupado extends BloqueMemoria {
  readonly #pid: number;

  constructor(inicio: number, tamano: number, pid: number) {
    super(inicio, tamano);
    this.#pid = pid;
    Object.freeze(this);
  }

  get pid(): number {
    return this.#pid;
  }

  get libre(): boolean {
    return false;
  }

  puedeAlojar(_tamano: number): boolean {
    return false;
  }

  perteneceA(pid: number): boolean {
    return this.pid === pid;
  }

  ocupar(_pid: number, _tamano: number): readonly BloqueMemoria[] {
    return Guardia.rechazar(() => new OperacionMemoriaInvalidaError(`El bloque en ${this.inicio} ya está ocupado`));
  }

  liberar(): BloqueLibre {
    return new BloqueLibre(this.inicio, this.tamano);
  }

  /** Un ocupado nunca se fusiona. */
  combinarCon(siguiente: BloqueMemoria): readonly BloqueMemoria[] {
    return [this, siguiente];
  }

  combinarTrasLibre(anterior: BloqueLibre): readonly BloqueMemoria[] {
    return [anterior, this];
  }
}
