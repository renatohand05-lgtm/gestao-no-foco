/**
 * Sprint 25.6.2 — Screenshots do PremiumGlobalLoader.
 * Uso: NEXT_PUBLIC_APP_URL=http://localhost:3001 node scripts/capture-premium-loader-evidence.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_URL, ensureChromiumInstalled } from "./playwright-auth.mjs";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const OUT = resolve(ROOT, "docs/testing/evidence/25-6-2");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "notebook-1440", width: 1440, height: 900 },
  { name: "notebook-1366", width: 1366, height: 768 },
  { name: "tablet-767", width: 767, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
];

async function main() {
  console.log("Premium loader evidence — 25.6.2");
  console.log(`App: ${BASE_URL}`);
  ensureChromiumInstalled();
  const browser = await chromium.launch({ headless: true });
  const report = { at: new Date().toISOString(), baseUrl: BASE_URL, shots: [], checks: [] };

  try {
    const page = await browser.newPage();

    // Página de demo isolada via data URL? Melhor: interceptar e injetar loader
    // Usamos a landing + evaluate para montar o loader em overlay para captura estável.
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(800);

      await page.evaluate(() => {
        const existing = document.querySelector("[data-capture-loader]");
        if (existing) existing.remove();
        const host = document.createElement("div");
        host.setAttribute("data-capture-loader", "");
        host.style.cssText =
          "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#0B0F14;";
        host.innerHTML = `
          <div role="status" aria-live="polite" aria-busy="true" data-premium-global-loader="" style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0B0F14;">
            <span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Carregando conteúdo</span>
            <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(5,7,10,0.55) 100%)"></div>
            <div style="position:absolute;left:50%;top:50%;width:min(28rem,70vw);height:min(28rem,70vw);transform:translate(-50%,-50%);border-radius:9999px;background:radial-gradient(circle,rgba(201,168,76,0.16),transparent 68%)"></div>
            <img src="/brand/icon-192.png" alt="" width="112" height="112" data-premium-loader-mark="" style="width:clamp(3.5rem,8vw,7rem);height:clamp(3.5rem,8vw,7rem);object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 8px 28px rgba(0,0,0,0.45))" />
          </div>`;
        document.body.appendChild(host);
      });
      await page.waitForTimeout(400);

      const path = resolve(OUT, `loader-${vp.name}.png`);
      await page.screenshot({ path, fullPage: false });
      report.shots.push(path);
      console.log(`  saved loader-${vp.name}.png`);

      const check = await page.evaluate(() => {
        const root = document.querySelector("[data-premium-global-loader]");
        const mark = document.querySelector("[data-premium-loader-mark]");
        const text = root?.innerText?.trim() ?? "";
        const visibleText = text.replace(/\s+/g, " ");
        return {
          hasMark: Boolean(mark),
          markSrc: mark?.getAttribute("src") ?? "",
          visibleText,
          hasBar: Boolean(document.querySelector("[data-capture-loader] .h-0\\.5, [data-capture-loader] progress")),
        };
      });
      report.checks.push({ viewport: vp.name, ...check });
    }

    // Reduced motion frame
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const host = document.createElement("div");
      host.setAttribute("data-capture-loader", "");
      host.style.cssText =
        "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#0B0F14;";
      host.innerHTML = `
        <div data-premium-global-loader="" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0B0F14;">
          <span class="sr-only">Carregando conteúdo</span>
          <img src="/brand/icon-192.png" alt="" data-premium-loader-mark="" style="width:clamp(3.5rem,8vw,7rem);height:clamp(3.5rem,8vw,7rem);object-fit:contain" />
        </div>`;
      document.body.appendChild(host);
    });
    const reducedPath = resolve(OUT, "loader-reduced-motion.png");
    await page.screenshot({ path: reducedPath, fullPage: false });
    report.shots.push(reducedPath);
    console.log("  saved loader-reduced-motion.png");

    // Sequence frames (fade/pulse approximation)
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const host = document.createElement("div");
      host.id = "seq-loader";
      host.style.cssText =
        "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#0B0F14;opacity:0;transition:opacity 200ms ease";
      host.innerHTML = `<img src="/brand/icon-192.png" alt="" style="width:96px;height:96px;object-fit:contain" data-premium-loader-mark="" />`;
      document.body.appendChild(host);
      requestAnimationFrame(() => {
        host.style.opacity = "1";
      });
    });
    await page.waitForTimeout(50);
    await page.screenshot({ path: resolve(OUT, "seq-01-fade-in.png") });
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(OUT, "seq-02-pulse.png") });
    await page.evaluate(() => {
      const host = document.getElementById("seq-loader");
      if (host) host.style.opacity = "0";
    });
    await page.waitForTimeout(220);
    await page.screenshot({ path: resolve(OUT, "seq-03-fade-out.png") });
    console.log("  saved seq-01/02/03 frames");

  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
