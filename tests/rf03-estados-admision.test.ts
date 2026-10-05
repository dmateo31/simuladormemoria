/** RF03 - Gestionar estados y admisión. */
import { describe, expect, it } from "vitest";
import { ASIGNACION_FALLIDA, ControlAdmision, NombreEstado, Proceso, TransicionInvalidaError } from "../src";
import type { IAsignadorMemoria } from "../src";
import { procesoEnCpu, simulador } from "./ayudantes";

describe("RF03 - estados (patrón State)", () => {
  it("recorre el ciclo de vida completo", () => {
    const proceso = new Proceso(1, 10, 1);
    proceso.esperarMemoria();
    proceso.esperarMemoria(); // seguir esperando no es error
    expect(proceso.estado).toBe(NombreEstado.EsperandoMemoria);
    proceso.admitir();
    expect(proceso.estado).toBe(NombreEstado.Listo);
    proceso.despachar();
    expect(proceso.estado).toBe(NombreEstado.Ejecutando);
    proceso.ejecutarUnidad();
    proceso.terminar();
    expect(proceso.estado).toBe(NombreEstado.Terminado);
  });

  it("rechaza transiciones no permitidas", () => {
    expect(() => new Proceso(1, 10, 1).despachar()).toThrow(TransicionInvalidaError);
    const listo = new Proceso(2, 10, 1);
    listo.admitir();
    expect(() => listo.ejecutarUnidad()).toThrow(TransicionInvalidaError);
    expect(() => procesoEnCpu(3, 2).terminar()).toThrow(TransicionInvalidaError); // le queda CPU
  });

  it("un Terminado no admite ninguna acción ni vuelve a una cola", () => {
    const proceso = procesoEnCpu(1, 1);
    proceso.ejecutarUnidad();
    proceso.terminar();
    expect(() => proceso.admitir()).toThrow(TransicionInvalidaError);
    expect(() => proceso.despachar()).toThrow(TransicionInvalidaError);
  });
});

describe("RF03 - admisión", () => {
  it("el que no cabe queda Esperando Memoria y los siguientes que caben entran", () => {
    const s = simulador(100);
    s.registrarProceso(1, 80, 3);
    s.registrarProceso(2, 50, 1);
    s.registrarProceso(3, 20, 1);
    expect(s.proceso(1).estado).toBe(NombreEstado.Nuevo);
    expect(s.avanzarTick().admitidos).toEqual([1, 3]);
    expect(s.proceso(2).estado).toBe(NombreEstado.EsperandoMemoria);
    expect(s.estado().enEspera).toEqual([2]);
  });

  it("sólo registra procesos Nuevos", () => {
    const listo = new Proceso(1, 10, 1);
    listo.admitir();
    expect(() => new ControlAdmision().registrar(listo)).toThrow(TransicionInvalidaError);
  });

  it("segregación de interfaces: sólo necesita algo que sepa asignar", () => {
    const pedidos: number[][] = [];
    const soloAsigna: IAsignadorMemoria = {
      asignar: (pid, tamano) => {
        pedidos.push([pid, tamano]);
        return ASIGNACION_FALLIDA;
      },
    };
    const admision = new ControlAdmision();
    admision.registrar(new Proceso(1, 50, 1));
    admision.registrar(new Proceso(2, 70, 1));
    expect(admision.admitir(soloAsigna)).toEqual([]);
    expect(pedidos).toEqual([
      [1, 50],
      [2, 70],
    ]);
  });
});
