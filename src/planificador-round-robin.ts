/** Planificador Round-Robin (RF06, RF07, RF08): cola FIFO de Listos y una única CPU. */
import { ConfiguracionInvalidaError, OperacionPlanificadorInvalidaError } from "./errores";
import { NombreEstado } from "./estados-proceso";
import { Guardia, primeroO } from "./guardia";
import type { IEjecutorCpu, IEncolador, IVistaPlanificador } from "./interfaces";
import type { Proceso } from "./proceso";
import { type SalidaCpu, SalidaBloqueo, SalidaContinua, SalidaExpulsion, SalidaOciosa, SalidaTerminacion } from "./salidas-cpu";

export type VistaPlanificador = Readonly<{
  pidEnCpu: number | null;
  listos: readonly number[];
}>;

type ReglaSalida = Readonly<{
  aplica: (proceso: Proceso, quantum: number, hayOtrosListos: boolean) => boolean;
  crear: (proceso: Proceso, quantum: number) => SalidaCpu;
}>;

/**
 * Reglas en orden de prioridad; se usa la PRIMERA que aplica:
 * finalización > bloqueo por E/S > expulsión por quantum > continúa (la última aplica siempre).
 */
const REGLAS_SALIDA: readonly ReglaSalida[] = [
  { aplica: (p) => p.cpuRestante === 0, crear: (p) => new SalidaTerminacion(p) },
  { aplica: (p) => p.tieneEventoPendiente(), crear: (p) => new SalidaBloqueo(p) },
  { aplica: (p, q, hayOtros) => p.quantumConsumido >= q && hayOtros, crear: (p) => new SalidaExpulsion(p) },
  { aplica: () => true, crear: (p, q) => new SalidaContinua(p, q) },
];

/** La CPU es una lista de 0 ó 1 procesos: "libre" y "ocupada" se tratan sin preguntar `if`. */
export class PlanificadorRoundRobin implements IEncolador, IEjecutorCpu, IVistaPlanificador {
  readonly #quantum: number;
  #colaListos: Proceso[] = [];
  #enCpu: Proceso[] = [];

  constructor(quantum: number) {
    Guardia.enteroPositivo(quantum, "El quantum", ConfiguracionInvalidaError);
    this.#quantum = quantum;
  }

  vista(): VistaPlanificador {
    return Object.freeze({
      pidEnCpu: primeroO(this.#enCpu.map((proceso) => proceso.pid), null),
      listos: Object.freeze(this.#colaListos.map((proceso) => proceso.pid)),
    });
  }

  encolar(proceso: Proceso): void {
    Guardia.verificar(
      proceso.estado === NombreEstado.Listo && !this.#colaListos.includes(proceso),
      () => new OperacionPlanificadorInvalidaError(`P${proceso.pid} no está Listo o ya está en la cola`),
    );
    this.#colaListos.push(proceso);
  }

  /**
   * splice(0, 1 - enCpu.length) despacha al primero sólo si la CPU está libre.
   * Se ejecuta una unidad al que esté en la CPU (0 ó 1); si no hay nadie, la salida es Ociosa.
   */
  ejecutarTick(): SalidaCpu {
    const despachados = this.#colaListos.splice(0, 1 - this.#enCpu.length);
    despachados.forEach((proceso) => proceso.despachar());
    this.#enCpu.push(...despachados);
    const salidas = this.#enCpu.map((proceso) => this.#ejecutarUnidad(proceso));
    return primeroO(salidas, new SalidaOciosa());
  }

  #ejecutarUnidad(proceso: Proceso): SalidaCpu {
    proceso.ejecutarUnidad();
    const hayOtros = this.#colaListos.length > 0;
    const regla = REGLAS_SALIDA.find((r) => r.aplica(proceso, this.#quantum, hayOtros)) as ReglaSalida;
    const salida = regla.crear(proceso, this.#quantum);
    salida.aplicarAProceso();
    this.#enCpu = this.#enCpu.filter(() => !salida.liberaCpu);
    this.#colaListos.push(...[proceso].filter(() => salida.reencola));
    return salida;
  }
}
