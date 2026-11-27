// Caça a bugs do comprador: os mesmos testes rodam em computador e em vários celulares/tablets.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "resultados/resultados.json" }], ["html", { outputFolder: "resultados/html", open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8080",
    locale: "pt-BR",
    timezoneId: "America/Fortaleza",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Service worker só no teste de "sem internet" (ele cria o próprio contexto); nos outros atrapalha a rede do robô.
    serviceWorkers: "block",
  },
  projects: [
    { name: "pc-chrome", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "pc-firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } } },
    { name: "pc-safari", use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 800 } } },
    { name: "notebook-pequeno", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 640 } } },
    { name: "iphone-se", use: { ...devices["iPhone SE"] } },
    { name: "iphone-15", use: { ...devices["iPhone 15"] } },
    { name: "android-pixel", use: { ...devices["Pixel 7"] } },
    { name: "android-pequeno", use: { ...devices["Galaxy S9+"], viewport: { width: 360, height: 740 } } },
    { name: "tablet-ipad", use: { ...devices["iPad (gen 7)"] } },
  ],
});
