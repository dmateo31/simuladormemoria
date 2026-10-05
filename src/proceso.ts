/** Proceso: protege su estado y sus contadores (RF02, RF03, RF08). */
import { EventoESInvalidoError, ProcesoInvalidoError, TransicionInvalidaError } from "./errores";
import { AccionProceso, EstadoProceso, NombreEstado, NUEVO } from "./estados-proceso";
import { EventoES } from "./evento-es";
import { Guardia } from "./guardia";

/** Ficha de solo lectura que se entrega hacia afuera en lugar del Proceso. */
export type InfoProceso = Readonly<{
  pid: number;
  memoriaRequerida: number;
  cpuTotal: number;
  cpuRestante: number;
  estado: NombreEstado;
  quantumConsumido: number;
  bloqueoRestante: number;
}>;

/**
 * Doble encapsulamiento: atributos `#privados` + getters públicos + setters privados `#setX`.
 * Los métodos de la clase también escriben a través de los setters.
 */
export class Proceso {
  readonly #pid: number;
  readonly #memoriaRequerida: number;
  readonly #cpuTotal: number;
  #cpuRestante = 0;
  #quantumConsumido = 0;
  #bloqueoRestante = 0;
  #estado: EstadoProceso = NUEVO;
  readonly #eventosPendientes: EventoES[];

  constructor(pid: number, memoriaRequerida: number, cpuTotal: number, eventosES: readonly EventoES[] = []) {
    Guardia.enteroPositivo(pid, "El PID", ProcesoInvalidoError);
    Guardia.enteroPositivo(memoriaRequerida, "La memoria requerida", ProcesoInvalidoError);
    Guardia.enteroPositivo(cpuTotal, "El tiempo total de CPU", ProcesoInvalidoError);
    // Disparo menor que la CPU total (si fuera igual, el proceso terminaría antes) y sin repetidos.
    const disparos = eventosES.map((evento) => evento.disparoTrasCpu);
    Guardia.verificar(
      disparos.every((disparo) => disparo < cpuTotal) && new Set(disparos).size === disparos.length,
      () => new EventoESInvalidoError(`Disparos de E/S inválidos: deben ser distintos y menores que ${cpuTotal}`),
    );
    this.#pid = pid;
    this.#memoriaRequerida = memoriaRequerida;
    this.#cpuTotal = cpuTotal;
    this.#setCpuRestante(cpuTotal);
    this.#eventosPendientes = [...eventosES].sort((a, b) => a.disparoTrasCpu - b.disparoTrasCpu);
  }

  // ------------------------------------------------------------ getters públicos y setters privados
  get pid(): number {
    return this.#pid;
  }

  get memoriaRequerida(): number {
    return this.#memoriaRequerida;
  }

  get cpuTotal(): number {
    return this.#cpuTotal;
  }

  get cpuRestante(): number {
    return this.#cpuRestante;
  }
  #setCpuRestante(valor: number): void {
    Guardia.verificar(valor >= 0, () => new TransicionInvalidaError(`P${this.pid}: no le queda CPU`));
    this.#cpuRestante = valor;
  }

  get quantumConsumido(): number {
    return this.#quantumConsumido;
  }
  #setQuantumConsumido(valor: number): void {
    this.#quantumConsumido = valor;
  }

  get bloqueoRestante(): number {
    return this.#bloqueoRestante;
  }
  #setBloqueoRestante(valor: number): void {
    this.#bloqueoRestante = valor;
  }

  get estado(): NombreEstado {
    return this.#estado.nombre;
  }

  // ------------------------------------------------------------ consultas
  /** ¿Le toca bloquearse por E/S con la CPU consumida hasta ahora? */
  tieneEventoPendiente(): boolean {
    const cpuConsumida = this.cpuTotal - this.cpuRestante;
    return this.#eventosPendientes.slice(0, 1).some((evento) => evento.disparoTrasCpu === cpuConsumida);
  }

  bloqueoVencido(): boolean {
    return this.bloqueoRestante === 0;
  }

  info(): InfoProceso {
    return Object.freeze({
      pid: this.pid,
      memoriaRequerida: this.memoriaRequerida,
      cpuTotal: this.cpuTotal,
      cpuRestante: this.cpuRestante,
      estado: this.estado,
      quantumConsumido: this.quantumConsumido,
      bloqueoRestante: this.bloqueoRestante,
    });
  }

  // ------------------------------------------------------------ transiciones
  /** Único lugar que cambia el estado: el estado actual decide si la acción es válida. */
  #transicionar(accion: AccionProceso): void {
    this.#estado = this.#estado.aplicar(accion);
  }

  esperarMemoria(): void {
    this.#transicionar(AccionProceso.EsperarMemoria);
  }

  admitir(): void {
    this.#transicionar(AccionProceso.Admitir);
  }

  /** Listo → Ejecutando, con el quantum en cero (RF07). */
  despachar(): void {
    this.#transicionar(AccionProceso.Despachar);
    this.#setQuantumConsumido(0);
  }

  /** Consume una unidad de CPU y una de quantum. */
  ejecutarUnidad(): void {
    this.#transicionar(AccionProceso.Ejecutar);
    this.#setCpuRestante(this.cpuRestante - 1);
    this.#setQuantumConsumido(this.quantumConsumido + 1);
  }

  /**
   * Sigue en la CPU. Si agotó el quantum (y no hay otros Listos), lo renueva:
   * el resto (%) da 0 cuando quantumConsumido === quantum y no cambia si es menor. Sin if.
   */
  seguirEnCpu(quantum: number): void {
    this.#transicionar(AccionProceso.Ejecutar);
    this.#setQuantumConsumido(this.quantumConsumido % quantum);
  }

  expulsar(): void {
    this.#transicionar(AccionProceso.Expulsar);
  }

  /** Ejecutando → Bloqueado por su evento de E/S. Conserva la memoria. */
  bloquear(): void {
    Guardia.verificar(this.tieneEventoPendiente(), () => new TransicionInvalidaError(`P${this.pid}: no tiene E/S pendiente`));
    this.#transicionar(AccionProceso.Bloquear);
    this.#setBloqueoRestante((this.#eventosPendientes.shift() as EventoES).duracion);
  }

  avanzarBloqueo(): void {
    this.#transicionar(AccionProceso.AvanzarBloqueo);
    this.#setBloqueoRestante(Math.max(0, this.bloqueoRestante - 1));
  }

  desbloquear(): void {
    Guardia.verificar(this.bloqueoVencido(), () => new TransicionInvalidaError(`P${this.pid}: el bloqueo no venció`));
    this.#transicionar(AccionProceso.Desbloquear);
  }

  terminar(): void {
    Guardia.verificar(this.cpuRestante === 0, () => new TransicionInvalidaError(`P${this.pid}: le queda CPU`));
    this.#transicionar(AccionProceso.Terminar);
  }
}
