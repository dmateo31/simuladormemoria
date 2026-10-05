/**
 * Memoria contigua con coalescencia (RF04, RF05). Mantiene los bloques ordenados y contiguos,
 * cubriendo toda la memoria, sin dos libres seguidos. La política se recibe por composición (Strategy).
 */
import { BloqueLibre, type BloqueMemoria } from "./bloques-memoria";
import { ConfiguracionInvalidaError, OperacionMemoriaInvalidaError } from "./errores";
import { Guardia, primeroO } from "./guardia";
import type {
  IAsignadorMemoria,
  IEstadisticasMemoria,
  ILiberadorMemoria,
  IMapaMemoria,
  IPoliticaAsignacion,
  IResultadoAsignacion,
} from "./interfaces";
import type { EstadisticasMemoria } from "./metricas";
import { ASIGNACION_EXITOSA, ASIGNACION_FALLIDA } from "./resultados-asignacion";

export class GestorMemoria implements IAsignadorMemoria, ILiberadorMemoria, IMapaMemoria, IEstadisticasMemoria {
  readonly #memoriaTotal: number;
  readonly #politica: IPoliticaAsignacion;
  #bloques: BloqueMemoria[];

  constructor(memoriaTotal: number, politica: IPoliticaAsignacion) {
    Guardia.enteroPositivo(memoriaTotal, "La memoria total", ConfiguracionInvalidaError);
    this.#memoriaTotal = memoriaTotal;
    this.#politica = politica;
    this.#bloques = [new BloqueLibre(0, memoriaTotal)]; // RF01: un único bloque libre
  }

  /** Copia congelada: nadie de afuera puede alterar la lista interna. */
  mapa(): readonly BloqueMemoria[] {
    return Object.freeze([...this.#bloques]);
  }

  estadisticas(): EstadisticasMemoria {
    const libres = this.#bloques.filter((bloque) => bloque.libre).map((bloque) => bloque.tamano);
    const libreTotal = libres.reduce((suma, tamano) => suma + tamano, 0);
    return Object.freeze({
      total: this.#memoriaTotal,
      ocupada: this.#memoriaTotal - libreTotal,
      libreTotal,
      mayorLibre: Math.max(0, ...libres),
    });
  }

  /**
   * La política devuelve [bloque] o []. Con map se ocupa el bloque sólo si existe, y
   * [...exitos, FALLIDA][0] elige la respuesta sin if. Si falla, no se modifica nada.
   */
  asignar(pid: number, tamano: number): IResultadoAsignacion {
    Guardia.verificar(
      !this.#bloques.some((bloque) => bloque.perteneceA(pid)),
      () => new OperacionMemoriaInvalidaError(`P${pid} ya tiene memoria asignada`),
    );
    const exitos = this.#politica.seleccionar(this.#bloques, tamano).map((bloque) => this.#ocupar(bloque, pid, tamano));
    return primeroO(exitos, ASIGNACION_FALLIDA);
  }

  /** Libera el bloque del proceso y fusiona los huecos vecinos (izquierdo y derecho). */
  liberar(pid: number): void {
    const indice = this.#bloques.findIndex((bloque) => bloque.perteneceA(pid));
    Guardia.verificar(indice >= 0, () => new OperacionMemoriaInvalidaError(`P${pid} no tiene memoria asignada`));
    this.#bloques.splice(indice, 1, (this.#bloques[indice] as BloqueMemoria).liberar());
    this.#coalescer();
  }

  #ocupar(bloque: BloqueMemoria, pid: number, tamano: number): IResultadoAsignacion {
    this.#bloques.splice(this.#bloques.indexOf(bloque), 1, ...bloque.ocupar(pid, tamano));
    return ASIGNACION_EXITOSA;
  }

  /** Combina cada bloque con el anterior; cada tipo decide si se fusiona (no se mueven ocupados). */
  #coalescer(): void {
    this.#bloques = this.#bloques
      .slice(1)
      .reduce<BloqueMemoria[]>(
        (resultado, actual) => [
          ...resultado.slice(0, -1),
          ...(resultado[resultado.length - 1] as BloqueMemoria).combinarCon(actual),
        ],
        this.#bloques.slice(0, 1),
      );
  }
}
