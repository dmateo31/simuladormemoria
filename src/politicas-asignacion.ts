/**
 * Políticas de asignación (RF04). La clase abstracta tiene el algoritmo común (Método Plantilla):
 * filtrar los bloques que alcanzan, ordenarlos por la clave de la política y tomar el primero.
 * Cada política sólo define su clave; todas terminan en el inicio, así el empate va a la menor dirección.
 */
import type { BloqueMemoria } from "./bloques-memoria";
import type { IPoliticaAsignacion } from "./interfaces";

export abstract class PoliticaAsignacionBase implements IPoliticaAsignacion {
  abstract readonly nombre: string;

  /** Devuelve [bloque elegido] o [] si ninguno alcanza. */
  seleccionar(bloques: readonly BloqueMemoria[], tamano: number): readonly BloqueMemoria[] {
    return bloques
      .filter((bloque) => bloque.puedeAlojar(tamano))
      .sort((a, b) => compararClaves(this.clave(a), this.clave(b)))
      .slice(0, 1);
  }

  protected abstract clave(bloque: BloqueMemoria): readonly number[];
}

/** Compara componente por componente: la primera diferencia distinta de cero decide. */
function compararClaves(a: readonly number[], b: readonly number[]): number {
  return a.map((valor, i) => valor - (b[i] as number)).reduce((resultado, diferencia) => resultado || diferencia, 0);
}

export class FirstFit extends PoliticaAsignacionBase {
  readonly nombre = "First-Fit";

  protected clave(bloque: BloqueMemoria): readonly number[] {
    return [bloque.inicio];
  }
}

export class BestFit extends PoliticaAsignacionBase {
  readonly nombre = "Best-Fit";

  protected clave(bloque: BloqueMemoria): readonly number[] {
    return [bloque.tamano, bloque.inicio];
  }
}

export class WorstFit extends PoliticaAsignacionBase {
  readonly nombre = "Worst-Fit";

  protected clave(bloque: BloqueMemoria): readonly number[] {
    return [-bloque.tamano, bloque.inicio];
  }
}
