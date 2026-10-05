/** Biblioteca del simulador de procesos y memoria (sin GUI, menú ni main). Todo se prueba con Vitest. */
export * from "./errores";
export type * from "./interfaces";
export { NombreEstado } from "./estados-proceso";
export { EventoES } from "./evento-es";
export { Proceso, type InfoProceso } from "./proceso";
export { BloqueMemoria, BloqueLibre, BloqueOcupado } from "./bloques-memoria";
export { PoliticaAsignacionBase, FirstFit, BestFit, WorstFit } from "./politicas-asignacion";
export { ASIGNACION_EXITOSA, ASIGNACION_FALLIDA } from "./resultados-asignacion";
export { GestorMemoria } from "./gestor-memoria";
export { TipoSalida, type SalidaCpu } from "./salidas-cpu";
export { PlanificadorRoundRobin } from "./planificador-round-robin";
export { GestorBloqueos } from "./gestor-bloqueos";
export { ControlAdmision } from "./control-admision";
export { RecolectorMetricas, calcularFragmentacionExterna, type MetricasSimulacion } from "./metricas";
export { ConfiguracionSimulacion } from "./configuracion";
export { Simulador, type EstadoSistema, type ResultadoTick } from "./simulador";
