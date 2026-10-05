# Simulador de procesos y memoria con POO (TypeScript)

Biblioteca de clases en **TypeScript** que simula cómo varios procesos comparten una memoria
contigua limitada y una única CPU. Incluye la admisión a memoria (First-Fit, Best-Fit o
Worst-Fit), la liberación con coalescencia, la planificación Round-Robin, los bloqueos por
Entrada/Salida y las métricas. El tiempo avanza en ticks discretos y deterministas.

Es la AE2 de **Paradigmas y Lenguajes de Programación II**, intercátedra con Sistemas
Operativos (Ingeniería en Sistemas de Información, FAITA, Universidad de la Cuenca del Plata, 2026).
Autor: **Mateo Di Fiore**.

> La entrega es **sólo la biblioteca**: no tiene interfaz gráfica, menú de consola, `main`
> ni script de demostración. Todo se construye y se verifica desde los tests de **Vitest**.

## Requisitos

- Node.js 20 o superior (incluye npm).
- Las dependencias de desarrollo (`typescript`, `vitest` y `@vitest/coverage-v8`) se instalan con npm.

## Instalación

```bash
git clone <URL-de-este-repositorio>
cd simulador-procesos-memoria
npm install
```

## Pruebas

```bash
npm test              # corre todos los tests una vez
npm run test:watch    # los vuelve a correr cada vez que guardás un archivo
npm run typecheck     # verifica los tipos con el compilador de TypeScript
```

## Cobertura

```bash
npm run coverage
```

- **Herramienta:** Vitest con el proveedor `v8` (`@vitest/coverage-v8`).
- **Alcance medido:** todos los archivos de `src/` (`coverage.include` en `vitest.config.ts`),
  incluso los que ningún test importe.
- **Umbral:** el comando falla si la cobertura de líneas baja del 95 %. La consigna exige
  estrictamente más del 90 %.
- **Reportes:** el resumen sale por consola y el reporte HTML queda en `coverage/index.html`.

## Integración continua

`.github/workflows/tests.yml` corre en cada push y en cada pull request, con Node 20 y 22.
Primero verifica los tipos (`npm run typecheck`) y después ejecuta los tests con cobertura
(`npm run coverage`). Al final publica el reporte de cobertura como artefacto descargable.

## Uso como biblioteca

```ts
import { BestFit, ConfiguracionSimulacion, EventoES, Simulador } from "./src";

const simulador = new Simulador(new ConfiguracionSimulacion(1024, 2, new BestFit()));
simulador.registrarProceso(1, 100, 3);
simulador.registrarProceso(2, 200, 4, [new EventoES(1, 2)]);

const resultado = simulador.avanzarTick(); // qué pasó en cada fase del tick
const estado = simulador.estado();         // colas, CPU y mapa de memoria (solo lectura)
const metricas = simulador.metricas();     // ocupación, CPU, fragmentación...
```

## Pautas de diseño aplicadas

| Pauta | Cómo se cumple |
|---|---|
| Uno o dos `if` como máximo | En todo `src/` hay **un solo `if`**, dentro de `Guardia.verificar`. El resto de las decisiones se toman con polimorfismo: patrón State para los estados del proceso, Strategy para las políticas, una clase por cada salida de la CPU, bloques libres u ocupados y resultados de asignación. |
| Doble encapsulamiento | Los atributos son `#privados` (privados también en ejecución). Se leen con getters públicos y se escriben sólo con setters privados (`#setAlgo`). Hacia afuera se entregan copias congeladas (`Object.freeze`). |
| Interfaces sin cuerpo y de una sola responsabilidad | Hay 20 interfaces en `src/interfaces.ts`, con un método cada una. Las clases implementan varias interfaces y cada cliente depende sólo de la que usa. |
| Herencia sólo con "es un" | Se usa en los estados del proceso, los bloques, las políticas, las salidas de la CPU y los errores. En el resto se usa composición. |

## Estructura

```
src/
  simulador.ts                 Simulador: coordina las 4 fases del tick
  configuracion.ts             ConfiguracionSimulacion: memoria, quantum y política
  proceso.ts                   Proceso (doble encapsulamiento) e InfoProceso
  estados-proceso.ts           Patrón State: un estado por clase, con su tabla de transiciones
  evento-es.ts                 EventoES: disparo y duración de una E/S
  bloques-memoria.ts           BloqueMemoria (abstracta), BloqueLibre, BloqueOcupado
  politicas-asignacion.ts      PoliticaAsignacionBase (abstracta), FirstFit, BestFit, WorstFit
  resultados-asignacion.ts     AsignacionExitosa / AsignacionFallida
  gestor-memoria.ts            Asignación contigua y coalescencia
  salidas-cpu.ts               Una clase por cada forma de salir de la CPU
  planificador-round-robin.ts  Cola FIFO, CPU y reglas de salida
  gestor-bloqueos.ts           Temporizadores de E/S
  control-admision.ts          Espera de memoria en orden de registro
  metricas.ts                  Fórmulas y RecolectorMetricas
  interfaces.ts                Contratos de un método
  guardia.ts                   Validaciones (único if)
  errores.ts                   Jerarquía de errores
  index.ts                     Exportaciones de la biblioteca
tests/                         Un archivo por requerimiento + colaboración + comparación de políticas
docs/uml/                      Diagramas (.puml editable + .png/.svg legibles)
docs/informe/                  Informe técnico (PDF y DOCX editable)
docs/evidencias/               Capturas de los tests y de la cobertura
docs/bitacora.md               Bitácora individual
```

## Diagramas UML

| Diagrama | Fuente editable | Versión legible |
|---|---|---|
| Clases, completo | `docs/uml/diagrama_clases.puml` | `.svg` (con zoom) y `.png` |
| Clases, vista 1: procesos y estados | `docs/uml/clases_1_procesos.puml` | `.png` / `.svg` |
| Clases, vista 2: memoria | `docs/uml/clases_2_memoria.puml` | `.png` / `.svg` |
| Clases, vista 3: CPU y E/S | `docs/uml/clases_3_cpu.puml` | `.png` / `.svg` |
| Clases, vista 4: simulador | `docs/uml/clases_4_simulador.puml` | `.png` / `.svg` |
| Secuencia RF03 + RF04: admisión y asignación | `docs/uml/seq_rf03_rf04_admision_memoria.puml` | `.png` / `.svg` |
| Secuencia RF05: liberación y coalescencia | `docs/uml/seq_rf05_liberacion_coalescencia.puml` | `.png` / `.svg` |
| Secuencia RF06 + RF07: tick Round-Robin | `docs/uml/seq_rf06_rf07_tick_round_robin.puml` | `.png` / `.svg` |
| Secuencia RF08: bloqueo por E/S | `docs/uml/seq_rf08_bloqueo_es.puml` | `.png` / `.svg` |

Para regenerar las imágenes se puede usar la extensión PlantUML de VS Code o este comando:
`java -jar plantuml.jar -tpng -tsvg docs/uml/*.puml`.

## Convenciones adoptadas

- En el tick 0 la memoria está vacía y la CPU libre. La configuración de referencia es 1024 KB y quantum 2.
- Cada tick tiene cuatro fases, en este orden: 1) admisión, 2) bloqueados, 3) despacho y ejecución RR, 4) reloj y métricas.
- Un proceso registrado queda en estado **Nuevo** y se intenta admitir en la fase 1 del tick siguiente.
- Cuando un proceso deja la CPU, la prioridad es: finalización > bloqueo por E/S > quantum.
- Se cuenta un cambio de contexto en la expulsión por quantum (con otros Listos) y en el
  bloqueo por E/S. No se cuentan el despacho inicial, la finalización ni la renovación de quantum.
- El disparo de un evento de E/S tiene que ser menor que la CPU total del proceso, y un mismo
  proceso no puede tener dos eventos con el mismo disparo.
