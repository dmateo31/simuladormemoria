/** Evento de E/S (RF08): tras `disparoTrasCpu` unidades de CPU, el proceso se bloquea `duracion` ticks. */
import { EventoESInvalidoError } from "./errores";
import { Guardia } from "./guardia";

export class EventoES {
  readonly #disparoTrasCpu: number;
  readonly #duracion: number;

  constructor(disparoTrasCpu: number, duracion: number) {
    Guardia.enteroPositivo(disparoTrasCpu, "El disparo de E/S", EventoESInvalidoError);
    Guardia.enteroPositivo(duracion, "La duración de E/S", EventoESInvalidoError);
    this.#disparoTrasCpu = disparoTrasCpu;
    this.#duracion = duracion;
    Object.freeze(this);
  }

  get disparoTrasCpu(): number {
    return this.#disparoTrasCpu;
  }

  get duracion(): number {
    return this.#duracion;
  }
}
