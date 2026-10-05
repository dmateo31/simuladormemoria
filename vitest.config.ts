import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Se mide todo el código de producción, aunque algún archivo no lo importe ningún test.
      include: ["src/**/*.ts"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      // La consigna exige cobertura de líneas estrictamente mayor al 90 %.
      thresholds: { lines: 95 },
    },
  },
});
