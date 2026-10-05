/**
 * Comparación de políticas con la misma carga (datos del informe, sección "Análisis de fragmentación").
 * 1000 KB, quantum 2. Tras el tick 4 hay huecos de 300 KB (en 0) y 200 KB (en 400); llegan P6 (180) y P7 (280).
 */
import { describe, expect, it } from "vitest";
import { BestFit, FirstFit, WorstFit } from "../src";
import type { IPoliticaAsignacion } from "../src";
import { simulador } from "./ayudantes";

const LLEGADAS = new Map<number, number[][]>([
  [0, [[1, 300, 1], [2, 100, 12], [3, 200, 1], [4, 100, 12], [5, 300, 12]]],
  [4, [[6, 180, 6], [7, 280, 6]]],
  [10, [[8, 110, 4]]],
  [14, [[9, 150, 4]]],
]);

function correr(politica: IPoliticaAsignacion) {
  const s = simulador(1000, 2, politica);
  const admision = new Map<number, number>();
  const fragmentaciones: number[] = [];
  Array.from({ length: 58 }).forEach(() => {
    (LLEGADAS.get(s.tick) ?? []).forEach(([pid, mem, cpu]) => s.registrarProceso(pid!, mem!, cpu!));
    const r = s.avanzarTick();
    r.admitidos.forEach((pid) => admision.set(pid, r.tick));
    fragmentaciones.push(r.metricas.fragmentacionExterna);
  });
  return {
    admisiones: [6, 7, 8, 9].map((pid) => admision.get(pid)),
    promedio: fragmentaciones.reduce((a, b) => a + b, 0) / fragmentaciones.length,
    terminados: s.estado().terminados.length,
  };
}

describe("Comparación de políticas", () => {
  it.each([
    { politica: new FirstFit(), admisiones: [5, 35, 11, 15], promedio: 14.4 },
    { politica: new BestFit(), admisiones: [5, 5, 33, 35], promedio: 35.44 },
    { politica: new WorstFit(), admisiones: [5, 33, 11, 31], promedio: 28.41 },
  ])("$politica.nombre: ticks de admisión y fragmentación promedio", ({ politica, admisiones, promedio }) => {
    const r = correr(politica);
    expect(r.admisiones).toEqual(admisiones);
    expect(r.promedio).toBeCloseTo(promedio, 1);
    expect(r.terminados).toBe(9);
  });
});
