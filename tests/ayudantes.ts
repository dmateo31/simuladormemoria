/** Funciones de apoyo para los tests: cada test arma sus propios objetos, sin estado compartido. */
import { ConfiguracionSimulacion, Proceso, Simulador } from "../src";
import type { BloqueMemoria, EventoES, IPoliticaAsignacion } from "../src";

/** Configuración de referencia de la consigna: 1024 KB y quantum 2. */
export function simulador(memoria = 1024, quantum = 2, politica?: IPoliticaAsignacion): Simulador {
  return new Simulador(new ConfiguracionSimulacion(memoria, quantum, politica));
}

/** Proceso ya en la CPU (Nuevo → Listo → Ejecutando). */
export function procesoEnCpu(pid = 1, cpu = 5, eventos: readonly EventoES[] = []): Proceso {
  const proceso = new Proceso(pid, 100, cpu, eventos);
  proceso.admitir();
  proceso.despachar();
  return proceso;
}

/** Mapa de memoria como texto: "L:0-100" (libre) o "P3:100-250" (ocupado por P3). */
export function enTexto(bloques: readonly BloqueMemoria[]): string[] {
  return bloques.map((b) => `${b.libre ? "L" : `P${b.pid}`}:${b.inicio}-${b.fin}`);
}
