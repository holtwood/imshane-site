// Phase 8 Playwright smoke：console.error / pageerror / 本地请求失败 = 0
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
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
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const pages = ["/", "/blog/", "/blog/hello-world-migrated-none", "/tags/", "/tags/go/", "/projects/", "/projects/cuflash/", "/about/", "/404"];
// pick real posts: a short one + a long one
pages[2] = "/blog/my-first-blog/";
pages.push("/blog/knowledge-points-interviews/", "/blog/code-optimize-1-simd/");

const browser = await chromium.launch();
const ctx = await browser.newContext();
let consoleErr = 0, pageErr = 0, reqFail = 0;
for (const p of pages) {
  const page = await ctx.newPage();
  page.on("console", m => { if (m.type() === "error") { consoleErr++; console.log(`  console.error @${p}: ${m.text().slice(0, 120)}`); } });
  page.on("pageerror", e => { pageErr++; console.log(`  pageerror @${p}: ${e.message.slice(0, 120)}`); });
  page.on("requestfailed", r => { reqFail++; console.log(`  reqfail @${p}: ${r.url().slice(0, 120)}`); });
  page.on("response", r => { if (r.status() >= 400 && r.url().startsWith(base)) { reqFail++; console.log(`  http${r.status()} @${p}: ${r.url().slice(0, 120)}`); } });
  const resp = await page.goto(base + p, { waitUntil: "networkidle" });
  console.log(`${p}  ${resp.status()}`);
  await page.close();
}
// 404 route should return 404 status — Astro serves /404.html at that path
await browser.close();
server.close();
console.log(`\nconsole.error=${consoleErr} pageerror=${pageErr} failedLocalReq=${reqFail}`);
process.exit(consoleErr + pageErr + reqFail === 0 ? 0 : 1);
