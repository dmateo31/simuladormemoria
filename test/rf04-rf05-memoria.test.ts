/** RF04 - Asignar memoria contigua / RF05 - Liberar y coalescencia. */
import { describe, expect, it } from "vitest";
import {
  ASIGNACION_FALLIDA,
  BestFit,
  BloqueLibre,
  BloqueOcupado,
  FirstFit,
  GestorMemoria,
  OperacionMemoriaInvalidaError,
  WorstFit,
} from "../src";
import type { IPoliticaAsignacion } from "../src";
import { enTexto, simulador } from "./ayudantes";

/** 1000 KB con huecos de 300 (en 0), 100 (en 400) y 300 (en 600). */
function memoriaConHuecos(politica: IPoliticaAsignacion): GestorMemoria {
  const gestor = new GestorMemoria(1000, politica);
  [300, 100, 100, 100, 300, 100].forEach((tamano, i) => gestor.asignar(i + 1, tamano));
  [1, 3, 5].forEach((pid) => gestor.liberar(pid));
  return gestor;
}

/** P1:0-100 | P2:100-300 | P3:300-600 | L:600-1000 */
function memoriaConTresProcesos(): GestorMemoria {
  const gestor = new GestorMemoria(1000, new FirstFit());
  [100, 200, 300].forEach((tamano, i) => gestor.asignar(i + 1, tamano));
  return gestor;
}

describe("RF04 - asignación", () => {
  it("partición parcial: ocupado + resto libre", () => {
    const gestor = new GestorMemoria(1024, new FirstFit());
    gestor.asignar(1, 200);
    expect(enTexto(gestor.mapa())).toEqual(["P1:0-200", "L:200-1024"]);
  });

  it("ajuste exacto: no deja un bloque de tamaño cero", () => {
    const gestor = new GestorMemoria(1024, new FirstFit());
    gestor.asignar(1, 1024);
    expect(enTexto(gestor.mapa())).toEqual(["P1:0-1024"]);
  });

  it.each([
    { politica: new FirstFit(), esperado: "P9:0-80" },
    { politica: new BestFit(), esperado: "P9:400-480" },
    { politica: new WorstFit(), esperado: "P9:0-80" }, // empate de 300: gana la menor dirección
  ])("polimorfismo: $politica.nombre elige su bloque", ({ politica, esperado }) => {
    const gestor = memoriaConHuecos(politica);
    gestor.asignar(9, 80);
    expect(enTexto(gestor.mapa())).toContain(esperado);
  });

  it("sin hueco suficiente falla sin modificar nada, aunque la suma libre alcance", () => {
    const gestor = memoriaConHuecos(new FirstFit());
    const antes = enTexto(gestor.mapa());
    expect(gestor.estadisticas().libreTotal).toBe(700);
    expect(gestor.asignar(9, 400)).toBe(ASIGNACION_FALLIDA);
    expect(enTexto(gestor.mapa())).toEqual(antes);
  });

  it("rechaza dar memoria dos veces al mismo PID y ocupar un bloque ocupado", () => {
    const gestor = new GestorMemoria(100, new FirstFit());
    gestor.asignar(1, 10);
    expect(() => gestor.asignar(1, 10)).toThrow(OperacionMemoriaInvalidaError);
    expect(() => new BloqueOcupado(0, 10, 1).ocupar(2, 5)).toThrow(OperacionMemoriaInvalidaError);
  });

  it("el mapa que se entrega es una copia congelada", () => {
    const gestor = new GestorMemoria(1024, new FirstFit());
    const mapa = gestor.mapa();
    expect(Object.isFrozen(mapa)).toBe(true);
    gestor.asignar(1, 10);
    expect(enTexto(mapa)).toEqual(["L:0-1024"]);
  });

  it("el simulador usa la política configurada", () => {
    const s = simulador(1000, 2, new BestFit());
    [[1, 300, 1], [2, 100, 50], [3, 100, 1], [4, 500, 50]].forEach(([pid, mem, cpu]) =>
      s.registrarProceso(pid as number, mem as number, cpu as number),
    );
    s.avanzarTicks(4); // P1 y P3 terminan: huecos de 300 (en 0) y 100 (en 400)
    s.registrarProceso(5, 90, 1);
    s.avanzarTick();
    expect(enTexto(s.estado().mapaMemoria)).toContain("P5:400-490");
  });
});

describe("RF05 - liberación y coalescencia", () => {
  it("doble despacho: sólo libre + libre se fusionan", () => {
    expect(enTexto(new BloqueLibre(0, 10).combinarCon(new BloqueLibre(10, 5)))).toEqual(["L:0-15"]);
    expect(enTexto(new BloqueLibre(0, 10).combinarCon(new BloqueOcupado(10, 5, 1)))).toEqual(["L:0-10", "P1:10-15"]);
    expect(enTexto(new BloqueOcupado(0, 10, 1).combinarCon(new BloqueLibre(10, 5)))).toEqual(["P1:0-10", "L:10-15"]);
  });

  it("fusiona con el vecino derecho", () => {
    const gestor = memoriaConTresProcesos();
    gestor.liberar(3);
    expect(enTexto(gestor.mapa())).toEqual(["P1:0-100", "P2:100-300", "L:300-1000"]);
  });

  it("fusiona con el vecino izquierdo", () => {
    const gestor = memoriaConTresProcesos();
    gestor.liberar(1);
    gestor.liberar(2);
    expect(enTexto(gestor.mapa())).toEqual(["L:0-300", "P3:300-600", "L:600-1000"]);
  });

  it("fusiona con ambos vecinos: al liberar todo queda un único bloque del tamaño total", () => {
    const gestor = memoriaConTresProcesos();
    [1, 3, 2].forEach((pid) => gestor.liberar(pid));
    expect(enTexto(gestor.mapa())).toEqual(["L:0-1000"]);
  });

  it("no mueve los bloques ocupados (no es compactación)", () => {
    const gestor = memoriaConTresProcesos();
    gestor.liberar(2);
    expect(enTexto(gestor.mapa())).toEqual(["P1:0-100", "L:100-300", "P3:300-600", "L:600-1000"]);
  });

  it("liberar un PID sin memoria o un bloque libre es un error", () => {
    expect(() => memoriaConTresProcesos().liberar(99)).toThrow(OperacionMemoriaInvalidaError);
    expect(() => new BloqueLibre(0, 10).liberar()).toThrow(OperacionMemoriaInvalidaError);
  });
});
