/** RF01 - Configurar e iniciar la simulación / RF02 - Registrar y consultar procesos. */
import { describe, expect, it } from "vitest";
import {
  ConfiguracionInvalidaError,
  ConfiguracionSimulacion,
  FirstFit,
  MemoriaExcedidaError,
  NombreEstado,
  PidDuplicadoError,
  Proceso,
  ProcesoInvalidoError,
  ProcesoNoEncontradoError,
  Simulador,
} from "../src";
import { enTexto, simulador } from "./ayudantes";

describe("RF01 - configuración", () => {
  it("por defecto usa 1024 KB, quantum 2 y First-Fit", () => {
    const configuracion = new ConfiguracionSimulacion();
    expect([configuracion.memoriaTotal, configuracion.quantum]).toEqual([1024, 2]);
    expect(configuracion.politica).toBeInstanceOf(FirstFit);
  });

  it("acepta el límite inferior: memoria 1 y quantum 1", () => {
    expect(() => new ConfiguracionSimulacion(1, 1)).not.toThrow();
  });

  it.each([0, -1, 1.5])("rechaza memoria total %s", (memoria) => {
    expect(() => new ConfiguracionSimulacion(memoria, 2)).toThrow(ConfiguracionInvalidaError);
  });

  it.each([0, 2.5])("rechaza quantum %s", (quantum) => {
    expect(() => new ConfiguracionSimulacion(1024, quantum)).toThrow(ConfiguracionInvalidaError);
  });

  it("una configuración inválida no deja un simulador a medio crear", () => {
    let creado: Simulador | undefined;
    expect(() => {
      creado = new Simulador(new ConfiguracionSimulacion(-5));
    }).toThrow(ConfiguracionInvalidaError);
    expect(creado).toBeUndefined();
  });

  it("estado inicial: tick 0, CPU libre, colas vacías, un único bloque libre y métricas en cero", () => {
    const s = simulador();
    expect(s.estado()).toEqual({
      tick: 0,
      pidEnCpu: null,
      listos: [],
      enEspera: [],
      bloqueados: [],
      terminados: [],
      mapaMemoria: s.estado().mapaMemoria,
    });
    expect(enTexto(s.estado().mapaMemoria)).toEqual(["L:0-1024"]);
    expect(s.metricas().cambiosContexto).toBe(0);
    expect(s.metricas().utilizacionCpu).toBe(0);
  });
});

describe("RF02 - registro y consulta de procesos", () => {
  it("registra en estado Nuevo con la CPU completa", () => {
    const s = simulador();
    const info = s.registrarProceso(7, 128, 4);
    expect(info).toEqual({
      pid: 7,
      memoriaRequerida: 128,
      cpuTotal: 4,
      cpuRestante: 4,
      estado: NombreEstado.Nuevo,
      quantumConsumido: 0,
      bloqueoRestante: 0,
    });
    expect(s.estado().enEspera).toEqual([7]);
  });

  it.each([
    [0, 10, 1],
    [1, -10, 1],
    [1, 10, 1.5],
  ])("rechaza pid=%s memoria=%s cpu=%s", (pid, memoria, cpu) => {
    expect(() => new Proceso(pid, memoria, cpu)).toThrow(ProcesoInvalidoError);
  });

  it("rechaza un PID repetido sin alterar lo registrado", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 3);
    expect(() => s.registrarProceso(1, 50, 2)).toThrow(PidDuplicadoError);
    expect(s.proceso(1).memoriaRequerida).toBe(100);
  });

  it("acepta exactamente la memoria total y rechaza un KB más", () => {
    const s = simulador();
    expect(s.registrarProceso(1, 1024, 1).memoriaRequerida).toBe(1024);
    expect(() => s.registrarProceso(2, 1025, 1)).toThrow(MemoriaExcedidaError);
    expect(() => s.proceso(2)).toThrow(ProcesoNoEncontradoError);
  });

  it("doble encapsulamiento: los datos sólo se leen; las fichas están congeladas", () => {
    const proceso = new Proceso(1, 10, 3);
    expect(() => {
      (proceso as unknown as { cpuRestante: number }).cpuRestante = 0;
    }).toThrow(TypeError);
    const info = proceso.info();
    expect(() => {
      (info as { estado: string }).estado = "Terminado";
    }).toThrow(TypeError);
    expect(proceso.cpuRestante).toBe(3);
  });
});
