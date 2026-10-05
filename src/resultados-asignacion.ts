/**
 * Resultado de pedir memoria (RF03, RF04). En vez de devolver null y obligar a preguntar
 * `if (resultado === null)`, se devuelve un objeto que sabe qué hacer con el proceso.
 */
import type { IResultadoAsignacion } from "./interfaces";
import type { Proceso } from "./proceso";

/** Hubo lugar: el proceso pasa a Listo. */
export class AsignacionExitosa implements IResultadoAsignacion {
  aplicarA(proceso: Proceso): boolean {
    proceso.admitir();
    return true;
  }
}

/** No hubo hueco suficiente: el proceso queda Esperando Memoria. */
export class AsignacionFallida implements IResultadoAsignacion {
  aplicarA(proceso: Proceso): boolean {
    proceso.esperarMemoria();
    return false;
  }
}

// No tienen datos propios: se usa siempre la misma instancia de cada una.
export const ASIGNACION_EXITOSA = Object.freeze(new AsignacionExitosa());
export const ASIGNACION_FALLIDA = Object.freeze(new AsignacionFallida());
