/**
 * Patrón State (RF03): cada estado es una clase con una tabla acción → próximo estado.
 * Una acción que no está en la tabla lanza TransicionInvalidaError: no hacen falta if ni switch.
 */
import { TransicionInvalidaError } from "./errores";
import { Guardia } from "./guardia";
import type { IEstadoProceso } from "./interfaces";

export enum NombreEstado {
  Nuevo = "Nuevo",
  EsperandoMemoria = "Esperando Memoria",
  Listo = "Listo",
  Ejecutando = "Ejecutando",
  Bloqueado = "Bloqueado",
  Terminado = "Terminado",
}

export enum AccionProceso {
  EsperarMemoria = "esperar memoria",
  Admitir = "admitir",
  Despachar = "despachar",
  Ejecutar = "ejecutar",
  Expulsar = "expulsar",
  Bloquear = "bloquear",
  AvanzarBloqueo = "avanzar bloqueo",
  Desbloquear = "desbloquear",
  Terminar = "terminar",
}

type Transiciones = ReadonlyMap<AccionProceso, () => EstadoProceso>;

/** Clase abstracta: comparte el algoritmo; cada estado aporta su nombre y su tabla. */
export abstract class EstadoProceso implements IEstadoProceso {
  abstract readonly nombre: NombreEstado;
  protected abstract readonly transiciones: Transiciones;

  aplicar(accion: AccionProceso): EstadoProceso {
    const destino = this.transiciones.get(accion);
    Guardia.verificar(
      destino !== undefined,
      () => new TransicionInvalidaError(`No se puede ${accion} en estado ${this.nombre}`),
    );
    return (destino as () => EstadoProceso)();
  }
}

class EstadoNuevo extends EstadoProceso {
  readonly nombre = NombreEstado.Nuevo;
  protected readonly transiciones: Transiciones = new Map([
    [AccionProceso.EsperarMemoria, () => ESPERANDO_MEMORIA],
    [AccionProceso.Admitir, () => LISTO],
  ]);
}

class EstadoEsperandoMemoria extends EstadoProceso {
  readonly nombre = NombreEstado.EsperandoMemoria;
  protected readonly transiciones: Transiciones = new Map([
    [AccionProceso.EsperarMemoria, () => ESPERANDO_MEMORIA], // seguir esperando no es error
    [AccionProceso.Admitir, () => LISTO],
  ]);
}

class EstadoListo extends EstadoProceso {
  readonly nombre = NombreEstado.Listo;
  protected readonly transiciones: Transiciones = new Map([[AccionProceso.Despachar, () => EJECUTANDO]]);
}

class EstadoEjecutando extends EstadoProceso {
  readonly nombre = NombreEstado.Ejecutando;
  protected readonly transiciones: Transiciones = new Map([
    [AccionProceso.Ejecutar, () => EJECUTANDO],
    [AccionProceso.Expulsar, () => LISTO],
    [AccionProceso.Bloquear, () => BLOQUEADO],
    [AccionProceso.Terminar, () => TERMINADO],
  ]);
}

class EstadoBloqueado extends EstadoProceso {
  readonly nombre = NombreEstado.Bloqueado;
  protected readonly transiciones: Transiciones = new Map([
    [AccionProceso.AvanzarBloqueo, () => BLOQUEADO],
    [AccionProceso.Desbloquear, () => LISTO],
  ]);
}

class EstadoTerminado extends EstadoProceso {
  readonly nombre = NombreEstado.Terminado;
  protected readonly transiciones: Transiciones = new Map(); // no vuelve a ninguna cola
}

// Los estados no tienen datos propios: una instancia de cada uno se comparte entre todos los procesos.
export const NUEVO: EstadoProceso = new EstadoNuevo();
const ESPERANDO_MEMORIA: EstadoProceso = new EstadoEsperandoMemoria();
const LISTO: EstadoProceso = new EstadoListo();
const EJECUTANDO: EstadoProceso = new EstadoEjecutando();
const BLOQUEADO: EstadoProceso = new EstadoBloqueado();
const TERMINADO: EstadoProceso = new EstadoTerminado();
