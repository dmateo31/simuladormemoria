/** Métricas (RF09). */
import type { ICalculadorMetricas, IEstadisticasMemoria, IRegistroTicks } from "./interfaces";

export type EstadisticasMemoria = Readonly<{
  total: number;
  ocupada: number;
  libreTotal: number;
  mayorLibre: number;
}>;

export type MetricasSimulacion = Readonly<{
  tick: number;
  ocupacionMemoria: number;
  utilizacionCpu: number;
  cambiosContexto: number;
  memoriaLibreTotal: number;
  mayorBloqueLibre: number;
  fragmentacionExterna: number;
}>;

/**
 * 100 × (1 − mayor / libre) = 100 × (libre − mayor) / libre.
 * Sin memoria libre el numerador es 0 y max(libre, 1) evita dividir por 0: da 0 % sin if.
 */
export function calcularFragmentacionExterna(mayorLibre: number, libreTotal: number): number {
  return (100 * (libreTotal - mayorLibre)) / Math.max(libreTotal, 1);
}

/** 100 × ticks con CPU ocupada / ticks transcurridos (0 % en el tick 0). */
export function calcularUtilizacionCpu(ticksOcupados: number, ticksTranscurridos: number): number {
  return (100 * ticksOcupados) / Math.max(ticksTranscurridos, 1);
}

export class RecolectorMetricas implements IRegistroTicks, ICalculadorMetricas {
  #ticksCpuOcupada = 0;
  #cambiosContexto = 0;

  get ticksCpuOcupada(): number {
    return this.#ticksCpuOcupada;
  }
  #setTicksCpuOcupada(valor: number): void {
    this.#ticksCpuOcupada = valor;
  }

  get cambiosContexto(): number {
    return this.#cambiosContexto;
  }
  #setCambiosContexto(valor: number): void {
    this.#cambiosContexto = valor;
  }

  /** Number(true) = 1 y Number(false) = 0: suma sólo cuando corresponde. */
  registrarTick(cpuOcupada: boolean, cambioContexto: boolean): void {
    this.#setTicksCpuOcupada(this.ticksCpuOcupada + Number(cpuOcupada));
    this.#setCambiosContexto(this.cambiosContexto + Number(cambioContexto));
  }

  calcular(tick: number, memoria: IEstadisticasMemoria): MetricasSimulacion {
    const m = memoria.estadisticas();
    return Object.freeze({
      tick,
      ocupacionMemoria: (100 * m.ocupada) / m.total,
      utilizacionCpu: calcularUtilizacionCpu(this.ticksCpuOcupada, tick),
      cambiosContexto: this.cambiosContexto,
      memoriaLibreTotal: m.libreTotal,
      mayorBloqueLibre: m.mayorLibre,
      fragmentacionExterna: calcularFragmentacionExterna(m.mayorLibre, m.libreTotal),
    });
  }
}
