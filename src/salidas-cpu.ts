/**
 * Qué pasa cuando un proceso termina su unidad de CPU (RF07, RF08, RF09).
 * Una clase por caso: el planificador crea la que corresponde y le pide que actúe.
 */
import type { DestinosSalida, IEfectoProceso, IEfectoSimulador } from "./interfaces";
import type { Proceso } from "./proceso";

export enum TipoSalida {
  Ociosa = "CPU ociosa",
  Continua = "continúa",
  Terminacion = "terminación",
  BloqueoES = "bloqueo por E/S",
  ExpulsionQuantum = "expulsión por quantum",
}

/** Por defecto una salida no hace nada, no libera la CPU y no cuenta cambio de contexto. */
export abstract class SalidaCpu implements IEfectoProceso, IEfectoSimulador {
  abstract readonly tipo: TipoSalida;
  /** RF09: sólo cuentan la expulsión por quantum y el bloqueo por E/S. */
  readonly cambioContexto: boolean = false;
  readonly liberaCpu: boolean = false;
  readonly reencola: boolean = false;

  abstract get pidEjecutado(): number | null;

  aplicarAProceso(): void {}

  efectuarEnSimulador(_destinos: DestinosSalida): void {}
}

/** Nadie usó la CPU. */
export class SalidaOciosa extends SalidaCpu {
  readonly tipo = TipoSalida.Ociosa;

  get pidEjecutado(): null {
    return null;
  }
}

abstract class SalidaConProceso extends SalidaCpu {
  readonly #proceso: Proceso;

  constructor(proceso: Proceso) {
    super();
    this.#proceso = proceso;
  }

  protected get proceso(): Proceso {
    return this.#proceso;
  }

  get pidEjecutado(): number {
    return this.proceso.pid;
  }
}

/** Sigue en la CPU; si agotó el quantum sin otros Listos, lo renueva (sin cambio de contexto). */
export class SalidaContinua extends SalidaConProceso {
  readonly tipo = TipoSalida.Continua;
  readonly #quantum: number;

  constructor(proceso: Proceso, quantum: number) {
    super(proceso);
    this.#quantum = quantum;
  }

  override aplicarAProceso(): void {
    this.proceso.seguirEnCpu(this.#quantum);
  }
}

/** Prioridad 1: no le queda CPU. Termina y libera su memoria. */
export class SalidaTerminacion extends SalidaConProceso {
  readonly tipo = TipoSalida.Terminacion;
  override readonly liberaCpu = true;

  override aplicarAProceso(): void {
    this.proceso.terminar();
  }

  override efectuarEnSimulador(destinos: DestinosSalida): void {
    destinos.memoria.liberar(this.proceso.pid);
    destinos.registrarTerminado(this.proceso.pid);
  }
}

/** Prioridad 2: le tocó su E/S. Se bloquea y deja la CPU, pero conserva la memoria. */
export class SalidaBloqueo extends SalidaConProceso {
  readonly tipo = TipoSalida.BloqueoES;
  override readonly cambioContexto = true;
  override readonly liberaCpu = true;

  override aplicarAProceso(): void {
    this.proceso.bloquear();
  }

  override efectuarEnSimulador(destinos: DestinosSalida): void {
    destinos.bloqueos.bloquear(this.proceso);
  }
}

/** Prioridad 3: agotó el quantum y hay otros Listos. Vuelve al final de la cola. */
export class SalidaExpulsion extends SalidaConProceso {
  readonly tipo = TipoSalida.ExpulsionQuantum;
  override readonly cambioContexto = true;
  override readonly liberaCpu = true;
  override readonly reencola = true;

  override aplicarAProceso(): void {
    this.proceso.expulsar();
  }
}
