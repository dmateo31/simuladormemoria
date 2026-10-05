/** Coordinador de la simulación (RF01–RF10): registra procesos y ejecuta las 4 fases de cada tick. */
import type { BloqueMemoria } from "./bloques-memoria";
import { ConfiguracionSimulacion } from "./configuracion";
import { ControlAdmision } from "./control-admision";
import { MemoriaExcedidaError, PidDuplicadoError, ProcesoNoEncontradoError } from "./errores";
import type { EventoES } from "./evento-es";
import { GestorBloqueos } from "./gestor-bloqueos";
import { GestorMemoria } from "./gestor-memoria";
import { Guardia } from "./guardia";
import type {
  IActualizadorBloqueos,
  IAdmisor,
  IAsignadorMemoria,
  ICalculadorMetricas,
  IEjecutorCpu,
  IEncolador,
  IEstadisticasMemoria,
  ILiberadorMemoria,
  IMapaMemoria,
  IRegistroAdmision,
  IRegistroBloqueos,
  IRegistroTicks,
  IVistaAdmision,
  IVistaBloqueos,
  IVistaPlanificador,
} from "./interfaces";
import { type MetricasSimulacion, RecolectorMetricas } from "./metricas";
import { PlanificadorRoundRobin } from "./planificador-round-robin";
import { type InfoProceso, Proceso } from "./proceso";
import type { SalidaCpu, TipoSalida } from "./salidas-cpu";

/** Foto de solo lectura del sistema (RF10). */
export type EstadoSistema = Readonly<{
  tick: number;
  pidEnCpu: number | null;
  listos: readonly number[];
  enEspera: readonly number[];
  bloqueados: readonly number[];
  terminados: readonly number[];
  mapaMemoria: readonly BloqueMemoria[];
}>;

/** Lo que pasó en un tick (RF06). */
export type ResultadoTick = Readonly<{
  tick: number;
  admitidos: readonly number[];
  desbloqueados: readonly number[];
  pidEjecutado: number | null;
  salida: TipoSalida;
  metricas: MetricasSimulacion;
}>;

/** Colaboradores tipados SÓLO con interfaces (& = "que cumpla todas"). */
export type ColaboradoresSimulador = Readonly<{
  memoria: IAsignadorMemoria & ILiberadorMemoria & IMapaMemoria & IEstadisticasMemoria;
  planificador: IEncolador & IEjecutorCpu & IVistaPlanificador;
  bloqueos: IRegistroBloqueos & IActualizadorBloqueos & IVistaBloqueos;
  admision: IRegistroAdmision & IAdmisor & IVistaAdmision;
  metricas: IRegistroTicks & ICalculadorMetricas;
}>;

/**
 * Fachada: no tiene lógica de memoria ni de CPU, coordina por composición a quienes la tienen.
 * Los colaboradores se pueden reemplazar (por ejemplo por espías en los tests) porque son interfaces.
 */
export class Simulador {
  readonly #configuracion: ConfiguracionSimulacion;
  readonly #colaboradores: ColaboradoresSimulador;
  readonly #procesos = new Map<number, Proceso>();
  readonly #terminados: number[] = [];
  readonly #historialCpu: (number | null)[] = [];
  #tick = 0;
  #metricas: MetricasSimulacion;

  constructor(
    configuracion = new ConfiguracionSimulacion(),
    reemplazos: Partial<ColaboradoresSimulador> = {},
  ) {
    this.#configuracion = configuracion;
    const porDefecto: ColaboradoresSimulador = {
      memoria: new GestorMemoria(configuracion.memoriaTotal, configuracion.politica),
      planificador: new PlanificadorRoundRobin(configuracion.quantum),
      bloqueos: new GestorBloqueos(),
      admision: new ControlAdmision(),
      metricas: new RecolectorMetricas(),
    };
    // Los reemplazos pisan a los de por defecto (spread de objetos, sin if).
    this.#colaboradores = Object.freeze({ ...porDefecto, ...reemplazos });
    this.#metricas = this.#colaboradores.metricas.calcular(0, this.#colaboradores.memoria);
  }

  get tick(): number {
    return this.#tick;
  }
  #setTick(valor: number): void {
    this.#tick = valor;
  }

  get configuracion(): ConfiguracionSimulacion {
    return this.#configuracion;
  }

  // ------------------------------------------------------------ RF02
  /** Registra un proceso en estado Nuevo; se admite en la fase 1 del próximo tick. Si algo falla, no cambia nada. */
  registrarProceso(pid: number, memoriaRequerida: number, cpuTotal: number, eventosES: readonly EventoES[] = []): InfoProceso {
    const proceso = new Proceso(pid, memoriaRequerida, cpuTotal, eventosES);
    Guardia.verificar(!this.#procesos.has(pid), () => new PidDuplicadoError(`Ya existe un proceso con PID ${pid}`));
    Guardia.verificar(
      memoriaRequerida <= this.#configuracion.memoriaTotal,
      () => new MemoriaExcedidaError(`P${pid} pide más memoria que la total`),
    );
    this.#colaboradores.admision.registrar(proceso);
    this.#procesos.set(pid, proceso);
    return proceso.info();
  }

  // ------------------------------------------------------------ RF06
  /** Avanza exactamente un tick: 1) admisión, 2) bloqueados, 3) CPU, 4) reloj y métricas. */
  avanzarTick(): ResultadoTick {
    const admitidos = this.#faseAdmision();
    const desbloqueados = this.#faseBloqueados();
    const salida = this.#faseCpu();
    this.#faseRelojYMetricas(salida);
    return Object.freeze({
      tick: this.tick,
      admitidos: admitidos.map((proceso) => proceso.pid),
      desbloqueados: desbloqueados.map((proceso) => proceso.pid),
      pidEjecutado: salida.pidEjecutado,
      salida: salida.tipo,
      metricas: this.#metricas,
    });
  }

  avanzarTicks(cantidad: number): readonly ResultadoTick[] {
    return Array.from({ length: cantidad }, () => this.avanzarTick());
  }

  #faseAdmision(): readonly Proceso[] {
    const admitidos = this.#colaboradores.admision.admitir(this.#colaboradores.memoria);
    admitidos.forEach((proceso) => this.#colaboradores.planificador.encolar(proceso));
    return admitidos;
  }

  #faseBloqueados(): readonly Proceso[] {
    const desbloqueados = this.#colaboradores.bloqueos.actualizar();
    desbloqueados.forEach((proceso) => this.#colaboradores.planificador.encolar(proceso));
    return desbloqueados;
  }

  /** La salida actúa sobre el sistema: si terminó libera memoria, si se bloqueó lo registra. */
  #faseCpu(): SalidaCpu {
    const salida = this.#colaboradores.planificador.ejecutarTick();
    salida.efectuarEnSimulador({
      memoria: this.#colaboradores.memoria,
      bloqueos: this.#colaboradores.bloqueos,
      registrarTerminado: (pid) => this.#terminados.push(pid),
    });
    return salida;
  }

  #faseRelojYMetricas(salida: SalidaCpu): void {
    this.#setTick(this.tick + 1);
    this.#historialCpu.push(salida.pidEjecutado);
    this.#colaboradores.metricas.registrarTick(salida.pidEjecutado !== null, salida.cambioContexto);
    this.#metricas = this.#colaboradores.metricas.calcular(this.tick, this.#colaboradores.memoria);
  }

  // ------------------------------------------------------------ RF09 y RF10
  metricas(): MetricasSimulacion {
    return this.#metricas;
  }

  proceso(pid: number): InfoProceso {
    const proceso = this.#procesos.get(pid);
    Guardia.verificar(proceso !== undefined, () => new ProcesoNoEncontradoError(`No existe el proceso ${pid}`));
    return (proceso as Proceso).info();
  }

  /** PID que usó la CPU en cada tick (null = ociosa). */
  historialCpu(): readonly (number | null)[] {
    return Object.freeze([...this.#historialCpu]);
  }

  estado(): EstadoSistema {
    const planificador = this.#colaboradores.planificador.vista();
    return Object.freeze({
      tick: this.tick,
      pidEnCpu: planificador.pidEnCpu,
      listos: planificador.listos,
      enEspera: this.#colaboradores.admision.enEspera(),
      bloqueados: this.#colaboradores.bloqueos.bloqueados(),
      terminados: Object.freeze([...this.#terminados]),
      mapaMemoria: this.#colaboradores.memoria.mapa(),
    });
  }
}
