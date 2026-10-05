/**
 * Admisión (RF03): procesos Nuevos o Esperando Memoria, en orden de registro.
 * En cada tick se intenta con TODOS: si uno no cabe, igual se prueba con los siguientes.
 */
import { TransicionInvalidaError } from "./errores";
import { NombreEstado } from "./estados-proceso";
import { Guardia } from "./guardia";
import type { IAdmisor, IAsignadorMemoria, IRegistroAdmision, IVistaAdmision } from "./interfaces";
import type { Proceso } from "./proceso";

export class ControlAdmision implements IRegistroAdmision, IAdmisor, IVistaAdmision {
  #pendientes: Proceso[] = [];

  registrar(proceso: Proceso): void {
    Guardia.verificar(
      proceso.estado === NombreEstado.Nuevo,
      () => new TransicionInvalidaError(`Sólo se registran procesos Nuevos; P${proceso.pid} está ${proceso.estado}`),
    );
    this.#pendientes.push(proceso);
  }

  /** El resultado de la asignación aplica la transición correcta y responde si fue admitido. */
  admitir(memoria: IAsignadorMemoria): readonly Proceso[] {
    const fueAdmitido = this.#pendientes.map((proceso) =>
      memoria.asignar(proceso.pid, proceso.memoriaRequerida).aplicarA(proceso),
    );
    const admitidos = this.#pendientes.filter((_, i) => fueAdmitido[i]);
    this.#pendientes = this.#pendientes.filter((_, i) => !fueAdmitido[i]);
    return admitidos;
  }

  enEspera(): readonly number[] {
    return Object.freeze(this.#pendientes.map((proceso) => proceso.pid));
  }
}
