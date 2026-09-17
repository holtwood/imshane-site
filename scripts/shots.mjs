// Phase 8 QA 截图：dist/ 静态服务 + Playwright
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const OUT = "/tmp/qa-shots";
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".xml": "application/xml", ".txt": "text/plain", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon" };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = path.join(DIST, p);
  if (p.endsWith("/")) f = path.join(f, "index.html");
  else if (!existsSync(f) && existsSync(f + ".html")) f += ".html";
  else if (!existsSync(f) && existsSync(path.join(f, "index.html"))) f = path.join(f, "index.html");
  try {
    const data = await readFile(f);
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const jobs = [
  ["home", "/", { w: 1440, h: 900 }],
  ["home-dark", "/", { w: 1440, h: 900, dark: true }],
  ["blog", "/blog/", { w: 1440, h: 900 }],
  ["blog-dark", "/blog/", { w: 1440, h: 900, dark: true }],
  ["long-article", "/blog/knowledge-points-interviews/", { w: 1440, h: 1200 }],
  ["long-article-dark", "/blog/knowledge-points-interviews/", { w: 1440, h: 1200, dark: true }],
  ["tags", "/tags/", { w: 1440, h: 900 }],
  ["projects", "/projects/", { w: 1440, h: 900 }],
  ["projects-dark", "/projects/", { w: 1440, h: 900, dark: true }],
  ["project-detail", "/projects/cuflash/", { w: 1440, h: 1200 }],
  ["about", "/about/", { w: 1440, h: 900 }],
  ["tablet-home", "/", { w: 768, h: 1024 }],
  ["mobile-home", "/", { w: 390, h: 844 }],
  ["mobile-long", "/blog/knowledge-points-interviews/", { w: 390, h: 844 }],
  ["mobile-projects", "/projects/", { w: 390, h: 844 }],
];
for (const [name, route, opt] of jobs) {
  const ctx = await browser.newContext({ viewport: { width: opt.w, height: opt.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (opt.dark) await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
  console.log(`shot ${name}`);
}
await browser.close();
server.close();
