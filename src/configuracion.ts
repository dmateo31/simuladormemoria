/** Configuración (RF01): se valida en el constructor, así nunca existe un simulador a medio crear. */
import { ConfiguracionInvalidaError } from "./errores";
import { Guardia } from "./guardia";
import type { IPoliticaAsignacion } from "./interfaces";
import { FirstFit } from "./politicas-asignacion";

export class ConfiguracionSimulacion {
  readonly #memoriaTotal: number;
  readonly #quantum: number;
  readonly #politica: IPoliticaAsignacion;

  constructor(memoriaTotal = 1024, quantum = 2, politica: IPoliticaAsignacion = new FirstFit()) {
    Guardia.enteroPositivo(memoriaTotal, "La memoria total", ConfiguracionInvalidaError);
    Guardia.enteroPositivo(quantum, "El quantum", ConfiguracionInvalidaError);
    this.#memoriaTotal = memoriaTotal;
    this.#quantum = quantum;
    this.#politica = politica;
    Object.freeze(this);
  }

  get memoriaTotal(): number {
    return this.#memoriaTotal;
  }

  get quantum(): number {
    return this.#quantum;
  }

  get politica(): IPoliticaAsignacion {
    return this.#politica;
  }
}
