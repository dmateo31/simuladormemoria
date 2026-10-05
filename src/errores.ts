/** Jerarquía de errores: todos son ErrorSimulacion, así se pueden atrapar juntos o distinguir en los tests. */
export class ErrorSimulacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** Memoria total o quantum inválidos (RF01). */
export class ConfiguracionInvalidaError extends ErrorSimulacion {}

/** PID, memoria o CPU que no son enteros positivos (RF02). */
export class ProcesoInvalidoError extends ErrorSimulacion {}

/** PID repetido (RF02). */
export class PidDuplicadoError extends ErrorSimulacion {}

/** Pide más memoria que la total (RF02). */
export class MemoriaExcedidaError extends ErrorSimulacion {}

/** Evento de E/S mal definido (RF08). */
export class EventoESInvalidoError extends ErrorSimulacion {}

/** Acción no permitida en el estado actual del proceso (RF03). */
export class TransicionInvalidaError extends ErrorSimulacion {}

/** PID no registrado. */
export class ProcesoNoEncontradoError extends ErrorSimulacion {}

/** Operación inválida sobre la memoria (RF04, RF05). */
export class OperacionMemoriaInvalidaError extends ErrorSimulacion {}

/** Encolar un proceso que no está Listo o que ya está en la cola (RF07). */
export class OperacionPlanificadorInvalidaError extends ErrorSimulacion {}
