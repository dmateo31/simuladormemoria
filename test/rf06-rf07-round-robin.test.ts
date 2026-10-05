/** RF06 - Tick determinista / RF07 - Round-Robin. */
import { describe, expect, it } from "vitest";
import {
  ConfiguracionInvalidaError,
  NombreEstado,
  OperacionPlanificadorInvalidaError,
  PlanificadorRoundRobin,
  Proceso,
  TipoSalida,
} from "../src";
import { simulador } from "./ayudantes";

function listo(pid: number, cpu: number): Proceso {
  const proceso = new Proceso(pid, 100, cpu);
  proceso.admitir();
  return proceso;
}

describe("RF07 - PlanificadorRoundRobin", () => {
  it("rechaza quantum inválido; sin Listos la CPU queda ociosa", () => {
    expect(() => new PlanificadorRoundRobin(0)).toThrow(ConfiguracionInvalidaError);
    const salida = new PlanificadorRoundRobin(2).ejecutarTick();
    expect([salida.tipo, salida.pidEjecutado, salida.cambioContexto]).toEqual([TipoSalida.Ociosa, null, false]);
  });

  it("cola FIFO: despacha al primero", () => {
    const planificador = new PlanificadorRoundRobin(2);
    [3, 1, 2].forEach((pid) => planificador.encolar(listo(pid, 5)));
    expect(planificador.ejecutarTick().pidEjecutado).toBe(3);
    expect(planificador.vista()).toEqual({ pidEnCpu: 3, listos: [1, 2] });
  });

  it("quantum agotado con otros Listos: expulsa al final de la cola (cambio de contexto)", () => {
    const planificador = new PlanificadorRoundRobin(1);
    const p1 = listo(1, 3);
    planificador.encolar(p1);
    planificador.encolar(listo(2, 3));
    const salida = planificador.ejecutarTick();
    expect([salida.tipo, salida.cambioContexto]).toEqual([TipoSalida.ExpulsionQuantum, true]);
    expect(p1.estado).toBe(NombreEstado.Listo);
    expect(planificador.vista()).toEqual({ pidEnCpu: null, listos: [2, 1] });
  });

  it("sólo encola procesos Listos y sin repetir", () => {
    const planificador = new PlanificadorRoundRobin(2);
    expect(() => planificador.encolar(new Proceso(1, 10, 1))).toThrow(OperacionPlanificadorInvalidaError);
    const proceso = listo(2, 1);
    planificador.encolar(proceso);
    expect(() => planificador.encolar(proceso)).toThrow(OperacionPlanificadorInvalidaError);
  });
});

describe("RF07 - casos mínimos en el simulador", () => {
  it("Q=2, P1 CPU 3 y P2 CPU 2: ejecución P1, P1, P2, P2, P1 con 1 cambio de contexto", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 3);
    s.registrarProceso(2, 100, 2);
    s.avanzarTicks(5);
    expect(s.historialCpu()).toEqual([1, 1, 2, 2, 1]);
    expect(s.metricas().cambiosContexto).toBe(1);
    expect(s.estado().terminados).toEqual([2, 1]);
  });

  it("un único proceso renueva el quantum sin cambio de contexto", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 5);
    s.avanzarTicks(3);
    expect(s.proceso(1).quantumConsumido).toBe(1); // renovó en el tick 2
    s.avanzarTicks(2);
    expect(s.historialCpu()).toEqual([1, 1, 1, 1, 1]);
    expect(s.metricas().cambiosContexto).toBe(0);
  });

  it("terminar justo al agotar el quantum no reencola (la finalización tiene prioridad)", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 2);
    s.registrarProceso(2, 100, 1);
    expect(s.avanzarTicks(2)[1]?.salida).toBe(TipoSalida.Terminacion);
    expect(s.estado().listos).toEqual([2]);
    expect(s.metricas().cambiosContexto).toBe(0);
  });
});

describe("RF06 - tick determinista", () => {
  it("cada llamada avanza exactamente un tick y como máximo un proceso usa la CPU", () => {
    const s = simulador();
    [1, 2, 3].forEach((pid) => s.registrarProceso(pid, 100, 2));
    s.avanzarTicks(6).forEach((resultado, i) => expect(resultado.tick).toBe(i + 1));
    expect(s.historialCpu()).toHaveLength(6);
  });

  it("dos simulaciones iguales dan el mismo resultado (sin reloj real ni azar)", () => {
    const correr = () => {
      const s = simulador(512, 3);
      [[1, 200, 4], [2, 300, 2], [3, 100, 5]].forEach(([p, m, c]) => s.registrarProceso(p as number, m as number, c as number));
      s.avanzarTicks(12);
      return [s.historialCpu(), s.metricas()];
    };
    expect(correr()).toEqual(correr());
  });
});
