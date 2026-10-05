/** RF09 - Métricas / RF10 - Consultar el estado del sistema. */
import { describe, expect, it } from "vitest";
import { EventoES, ProcesoNoEncontradoError, RecolectorMetricas, calcularFragmentacionExterna } from "../src";
import type { IEstadisticasMemoria } from "../src";
import { enTexto, simulador } from "./ayudantes";

describe("RF09 - métricas", () => {
  it("fragmentación: huecos de 100 y 300 → 25 %; sin memoria libre → 0 %", () => {
    expect(calcularFragmentacionExterna(300, 400)).toBeCloseTo(25);
    expect(calcularFragmentacionExterna(0, 0)).toBe(0);
  });

  it("huecos no contiguos de 100 y 300 KB generados por la simulación", () => {
    const s = simulador(600, 1);
    s.registrarProceso(1, 100, 1); // t1 termina → hueco 0-100
    s.registrarProceso(2, 100, 9); // t2 ejecuta y es expulsado
    s.registrarProceso(3, 300, 1); // t3 termina → hueco 200-500
    s.registrarProceso(4, 100, 9);
    s.avanzarTicks(3);
    const m = s.metricas();
    expect([m.memoriaLibreTotal, m.mayorBloqueLibre]).toEqual([400, 300]);
    expect(m.fragmentacionExterna).toBeCloseTo(25);
    expect(m.ocupacionMemoria).toBeCloseTo((100 * 200) / 600);
    expect(m.utilizacionCpu).toBeCloseTo(100);
  });

  it("memoria llena: 100 % ocupada, sin libre y 0 % de fragmentación", () => {
    const s = simulador();
    s.registrarProceso(1, 1024, 5);
    const m = s.avanzarTick().metricas;
    expect([m.ocupacionMemoria, m.memoriaLibreTotal, m.mayorBloqueLibre, m.fragmentacionExterna]).toEqual([100, 0, 0, 0]);
  });

  it("la utilización de CPU cuenta los ticks ociosos", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 1);
    s.avanzarTicks(4);
    expect(s.metricas().utilizacionCpu).toBeCloseTo(25);
  });

  it("segregación de interfaces: el recolector sólo necesita estadísticas", () => {
    const soloEstadisticas: IEstadisticasMemoria = {
      estadisticas: () => ({ total: 1000, ocupada: 600, libreTotal: 400, mayorLibre: 300 }),
    };
    expect(new RecolectorMetricas().calcular(0, soloEstadisticas).ocupacionMemoria).toBeCloseTo(60);
  });
});

describe("RF10 - estado del sistema", () => {
  it("expone tick, CPU, todas las colas y el mapa de memoria", () => {
    const s = simulador(500);
    s.registrarProceso(1, 100, 1); // termina en t1
    s.registrarProceso(2, 100, 5, [new EventoES(1, 5)]); // se bloquea en t2
    s.registrarProceso(3, 100, 5);
    s.registrarProceso(4, 100, 5);
    s.registrarProceso(5, 400, 1); // no cabe
    s.avanzarTicks(2);
    const estado = s.estado();
    expect([estado.tick, estado.pidEnCpu]).toEqual([2, null]);
    expect([estado.listos, estado.enEspera, estado.bloqueados, estado.terminados]).toEqual([[3, 4], [5], [2], [1]]);
    expect(enTexto(estado.mapaMemoria)).toEqual(["L:0-100", "P2:100-200", "P3:200-300", "P4:300-400", "L:400-500"]);
  });

  it("todo lo que devuelve está congelado y no cambia cuando el simulador avanza", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 3);
    const estado = s.estado();
    expect(() => (estado.terminados as number[]).push(9)).toThrow(TypeError);
    s.avanzarTicks(3);
    expect(estado.tick).toBe(0);
    expect(() => s.proceso(9)).toThrow(ProcesoNoEncontradoError);
  });

  it("invariantes en cada tick: sin duplicados, nunca dos en CPU, memoria contigua", () => {
    const s = simulador();
    const datos: [number, number, number, EventoES[]][] = [
      [1, 300, 5, [new EventoES(2, 3)]],
      [2, 500, 3, []],
      [3, 400, 4, [new EventoES(1, 1)]],
      [4, 600, 3, []],
    ];
    datos.forEach(([pid, mem, cpu, eventos]) => s.registrarProceso(pid, mem, cpu, eventos));
    Array.from({ length: 30 }).forEach(() => {
      const e = s.estado();
      const todos = [...[e.pidEnCpu].filter((p) => p !== null), ...e.listos, ...e.enEspera, ...e.bloqueados, ...e.terminados];
      expect(new Set(todos).size).toBe(todos.length);
      expect(todos).toHaveLength(4);
      expect(e.mapaMemoria.slice(1).every((b, i) => e.mapaMemoria[i]?.fin === b.inicio)).toBe(true);
      s.avanzarTick();
    });
    expect(s.estado().terminados).toHaveLength(4);
  });
});
