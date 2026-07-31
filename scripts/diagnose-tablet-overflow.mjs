import { chromium } from "playwright";
import { AUTH_FILE, BASE_URL, ensureChromiumInstalled } from "./playwright-auth.mjs";

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: AUTH_FILE });
const page = await ctx.newPage();
await page.setViewportSize({ width: 768, height: 1024 });
await page.goto(`${BASE_URL}/teste-renato-01/dashboard`, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForSelector('[data-dashboard-block="executive-brief"]', {
  timeout: 180000,
});
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const doc = document.documentElement;
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 2 || r.width > window.innerWidth + 2) {
      offenders.push({
        tag: el.tagName,
        cls: String(el.className || "").slice(0, 100),
        w: Math.round(r.width),
        right: Math.round(r.right),
        data:
          el.getAttribute("data-dashboard-block") ||
          el.getAttribute("data-premium-block") ||
          el.getAttribute("data-kpi-featured") ||
          el.getAttribute("data-chart-panel") ||
          null,
      });
    }
  }
  return {
    scrollW: doc.scrollWidth,
    clientW: doc.clientWidth,
    inner: window.innerWidth,
    offenders: offenders.slice(0, 20),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
