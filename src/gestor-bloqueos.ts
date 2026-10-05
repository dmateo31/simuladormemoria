/** Procesos bloqueados por E/S (RF08). Se descuentan recién en la fase 2 del tick siguiente al bloqueo. */
import { TransicionInvalidaError } from "./errores";
import { NombreEstado } from "./estados-proceso";
import { Guardia } from "./guardia";
import type { IActualizadorBloqueos, IRegistroBloqueos, IVistaBloqueos } from "./interfaces";
import type { Proceso } from "./proceso";

export class GestorBloqueos implements IRegistroBloqueos, IActualizadorBloqueos, IVistaBloqueos {
  #bloqueados: Proceso[] = [];

  bloquear(proceso: Proceso): void {
    Guardia.verificar(
      proceso.estado === NombreEstado.Bloqueado,
      () => new TransicionInvalidaError(`P${proceso.pid} no está Bloqueado`),
    );
    this.#bloqueados.push(proceso);
  }

  /** Descuenta un tick a todos; los que llegan a cero pasan a Listo y se devuelven en orden de bloqueo. */
  actualizar(): readonly Proceso[] {
    this.#bloqueados.forEach((proceso) => proceso.avanzarBloqueo());
    const vencidos = this.#bloqueados.filter((proceso) => proceso.bloqueoVencido());
    this.#bloqueados = this.#bloqueados.filter((proceso) => !proceso.bloqueoVencido());
    vencidos.forEach((proceso) => proceso.desbloquear());
    return vencidos;
  }

  bloqueados(): readonly number[] {
    return Object.freeze(this.#bloqueados.map((proceso) => proceso.pid));
  }
}
