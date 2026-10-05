/**
 * Contratos del simulador: sin código (sólo firmas) y con un único método cada uno.
 * Las clases implementan varias interfaces chicas y cada cliente depende sólo de la que usa.
 */
import type { BloqueMemoria } from "./bloques-memoria";
import type { AccionProceso } from "./estados-proceso";
import type { EstadisticasMemoria, MetricasSimulacion } from "./metricas";
import type { VistaPlanificador } from "./planificador-round-robin";
import type { Proceso } from "./proceso";
import type { SalidaCpu } from "./salidas-cpu";

// ---- procesos
export interface IEstadoProceso {
  aplicar(accion: AccionProceso): IEstadoProceso;
}

// ---- memoria
export interface IPoliticaAsignacion {
  seleccionar(bloques: readonly BloqueMemoria[], tamano: number): readonly BloqueMemoria[];
}

export interface IResultadoAsignacion {
  aplicarA(proceso: Proceso): boolean;
}

export interface IAsignadorMemoria {
  asignar(pid: number, tamano: number): IResultadoAsignacion;
}

export interface ILiberadorMemoria {
  liberar(pid: number): void;
}

export interface IMapaMemoria {
  mapa(): readonly BloqueMemoria[];
}

export interface IEstadisticasMemoria {
  estadisticas(): EstadisticasMemoria;
}

// ---- CPU
export interface IEncolador {
  encolar(proceso: Proceso): void;
}

export interface IEjecutorCpu {
  ejecutarTick(): SalidaCpu;
}

export interface IVistaPlanificador {
  vista(): VistaPlanificador;
}

// ---- Entrada/Salida
export interface IRegistroBloqueos {
  bloquear(proceso: Proceso): void;
}

export interface IActualizadorBloqueos {
  actualizar(): readonly Proceso[];
}

export interface IVistaBloqueos {
  bloqueados(): readonly number[];
}

// ---- admisión
export interface IRegistroAdmision {
  registrar(proceso: Proceso): void;
}

export interface IAdmisor {
  admitir(memoria: IAsignadorMemoria): readonly Proceso[];
}

export interface IVistaAdmision {
  enEspera(): readonly number[];
}

// ---- métricas
export interface IRegistroTicks {
  registrarTick(cpuOcupada: boolean, cambioContexto: boolean): void;
}

export interface ICalculadorMetricas {
  calcular(tick: number, memoria: IEstadisticasMemoria): MetricasSimulacion;
}

// ---- efectos de una salida de CPU
export interface IEfectoProceso {
  aplicarAProceso(): void;
}

export interface IEfectoSimulador {
  efectuarEnSimulador(destinos: DestinosSalida): void;
}

/** Lo que puede necesitar una salida de CPU (sólo datos, no comportamiento propio). */
export type DestinosSalida = Readonly<{
  memoria: ILiberadorMemoria;
  bloqueos: IRegistroBloqueos;
  registrarTerminado: (pid: number) => void;
}>;
