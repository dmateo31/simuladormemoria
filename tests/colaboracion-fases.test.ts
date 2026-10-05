/**
 * Pruebas de colaboración (RF06): verifican el ORDEN de las fases con "espías",
 * subclases de los colaboradores reales que anotan cada llamada y delegan con `super`.
 * El simulador los acepta porque depende de interfaces.
 */
import { describe, expect, it } from "vitest";
import {
  ConfiguracionSimulacion,
  ControlAdmision,
  EventoES,
  FirstFit,
  GestorBloqueos,
  GestorMemoria,
  NombreEstado,
  PlanificadorRoundRobin,
  RecolectorMetricas,
  Simulador,
} from "../src";
import type { IAsignadorMemoria, IEstadisticasMemoria, MetricasSimulacion, Proceso, SalidaCpu } from "../src";
import { simulador } from "./ayudantes";

function simuladorEspiado(bitacora: string[]): Simulador {
  class AdmisionEspia extends ControlAdmision {
    override admitir(memoria: IAsignadorMemoria): readonly Proceso[] {
      bitacora.push("1-admision");
      return super.admitir(memoria);
    }
  }
  class BloqueosEspia extends GestorBloqueos {
    override actualizar(): readonly Proceso[] {
      bitacora.push("2-bloqueados");
      return super.actualizar();
    }
  }
  class PlanificadorEspia extends PlanificadorRoundRobin {
    override ejecutarTick(): SalidaCpu {
      bitacora.push("3-cpu");
      return super.ejecutarTick();
    }
  }
  class MemoriaEspia extends GestorMemoria {
    override liberar(pid: number): void {
      bitacora.push(`liberar-P${pid}`);
      super.liberar(pid);
    }
  }
  class MetricasEspia extends RecolectorMetricas {
    override calcular(tick: number, memoria: IEstadisticasMemoria): MetricasSimulacion {
      bitacora.push(`4-metricas-t${tick}`);
      return super.calcular(tick, memoria);
    }
  }
  return new Simulador(new ConfiguracionSimulacion(1024, 2), {
    memoria: new MemoriaEspia(1024, new FirstFit()),
    planificador: new PlanificadorEspia(2),
    bloqueos: new BloqueosEspia(),
    admision: new AdmisionEspia(),
    metricas: new MetricasEspia(),
  });
}

describe("Colaboración - orden de fases", () => {
  it("cada tick: admisión, bloqueados, CPU (con la liberación), reloj y métricas", () => {
    const bitacora: string[] = [];
    const s = simuladorEspiado(bitacora);
    s.registrarProceso(1, 100, 1);
    s.avanzarTicks(2);
    expect(bitacora).toEqual([
      "4-metricas-t0",
      ...["1-admision", "2-bloqueados", "3-cpu", "liberar-P1", "4-metricas-t1"],
      ...["1-admision", "2-bloqueados", "3-cpu", "4-metricas-t2"],
    ]);
  });
});

describe("Colaboración - efectos entre fases", () => {
  it("una liberación al final del tick habilita la admisión recién en el siguiente", () => {
    const s = simulador(100);
    s.registrarProceso(1, 100, 1);
    s.registrarProceso(2, 60, 1);
    expect(s.avanzarTick().admitidos).toEqual([1]);
    expect(s.proceso(2).estado).toBe(NombreEstado.EsperandoMemoria);
    const segundo = s.avanzarTick();
    expect([segundo.admitidos, segundo.pidEjecutado]).toEqual([[2], 2]);
  });

  it("un proceso registrado a mitad de la simulación entra en la cola", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 4);
    s.avanzarTick();
    s.registrarProceso(2, 100, 1);
    s.avanzarTicks(4);
    expect(s.historialCpu()).toEqual([1, 1, 2, 1, 1]);
  });

  it("un desbloqueado se despacha en el mismo tick", () => {
    const s = simulador();
    s.registrarProceso(1, 100, 3, [new EventoES(1, 1)]);
    s.avanzarTick();
    const resultado = s.avanzarTick();
    expect([resultado.desbloqueados, resultado.pidEjecutado]).toEqual([[1], 1]);
  });
});
