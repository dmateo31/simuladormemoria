/** RF08 - Simular Entrada y Salida. */
import { describe, expect, it } from "vitest";
import {
  EventoES,
  EventoESInvalidoError,
  GestorBloqueos,
  NombreEstado,
  PlanificadorRoundRobin,
  Proceso,
  TipoSalida,
  TransicionInvalidaError,
} from "../src";
import { enTexto, procesoEnCpu, simulador } from "./ayudantes";

describe("RF08 - validación de eventos", () => {
  it.each([
    [0, 1],
    [1, 0],
    [1.5, 1],
  ])("rechaza disparo=%s duración=%s", (disparo, duracion) => {
    expect(() => new EventoES(disparo, duracion)).toThrow(EventoESInvalidoError);
  });

  it("rechaza un disparo igual a la CPU total o disparos repetidos", () => {
    expect(() => new Proceso(1, 10, 3, [new EventoES(3, 1)])).toThrow(EventoESInvalidoError);
    expect(() => new Proceso(1, 10, 5, [new EventoES(2, 1), new EventoES(2, 3)])).toThrow(EventoESInvalidoError);
  });
});

describe("RF08 - bloqueo", () => {
  it("se bloquea al llegar al disparo y vuelve a Listo al vencer el temporizador", () => {
    const proceso = procesoEnCpu(1, 3, [new EventoES(1, 2)]);
    expect(() => proceso.bloquear()).toThrow(TransicionInvalidaError); // todavía no le toca
    proceso.ejecutarUnidad();
    proceso.bloquear();
    expect([proceso.estado, proceso.bloqueoRestante]).toEqual([NombreEstado.Bloqueado, 2]);
    expect(() => proceso.desbloquear()).toThrow(TransicionInvalidaError); // no venció
    const gestor = new GestorBloqueos();
    gestor.bloquear(proceso);
    expect(gestor.actualizar()).toEqual([]);
    expect(gestor.actualizar()).toEqual([proceso]);
    expect(proceso.estado).toBe(NombreEstado.Listo);
    expect(gestor.bloqueados()).toEqual([]);
  });

  it("el gestor sólo acepta procesos Bloqueados", () => {
    expect(() => new GestorBloqueos().bloquear(procesoEnCpu())).toThrow(TransicionInvalidaError);
  });

  it("el bloqueo tiene prioridad sobre la rotación por quantum", () => {
    const planificador = new PlanificadorRoundRobin(1);
    const p1 = new Proceso(1, 100, 3, [new EventoES(1, 1)]);
    const p2 = new Proceso(2, 100, 3);
    [p1, p2].forEach((p) => {
      p.admitir();
      planificador.encolar(p);
    });
    expect(planificador.ejecutarTick().tipo).toBe(TipoSalida.BloqueoES);
    expect(planificador.vista().listos).toEqual([2]);
  });
});

describe("RF08 - E/S en el simulador", () => {
  it("al bloquearse conserva la memoria, libera la CPU y no consume CPU mientras espera", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 3, [new EventoES(1, 3)]);
    s.avanzarTicks(3);
    expect(s.historialCpu()).toEqual([1, null, null]);
    expect(s.estado().bloqueados).toEqual([1]);
    expect(enTexto(s.estado().mapaMemoria)).toEqual(["P1:0-100", "L:100-1024"]);
    const resultado = s.avanzarTick(); // vence y se despacha en el mismo tick
    expect([resultado.desbloqueados, resultado.pidEjecutado]).toEqual([[1], 1]);
  });

  it("vuelve al final de la cola y se cuentan los cambios de contexto", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 4, [new EventoES(1, 2)]);
    s.registrarProceso(2, 100, 3);
    s.avanzarTicks(7);
    // t1 P1 se bloquea | t2 P2 | t3 P1 vuelve, P2 agota quantum | t4-t5 P1 | t6 P2 termina | t7 P1 termina
    expect(s.historialCpu()).toEqual([1, 2, 2, 1, 1, 2, 1]);
    expect(s.metricas().cambiosContexto).toBe(3);
  });
});
