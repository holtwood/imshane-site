#!/usr/bin/env node
// Phase 8 全站 QA：route inventory / 内链与锚点 / SEO / RSS / sitemap /
// 安全扫描 / 身份审计 / 外部运行时资源。只读 dist/ 与源码。
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const SRCBLOG = path.join(ROOT, "src/content/blog");
const SRCPROJ = path.join(ROOT, "src/content/projects");

const issues = [];
const info = [];
const P = (sev, msg) => issues.push({ sev, msg });

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) htmlFiles.push(p);
  }
})(DIST);
const routes = htmlFiles.map(f => "/" + path.relative(DIST, f).replace(/index\.html$/, "").replace(/\.html$/, ""));

// ---------- 2. Route inventory ----------
const blogDirs = fs.readdirSync(SRCBLOG).filter(d => fs.existsSync(path.join(SRCBLOG, d, "index.md")));
const projDirs = fs.readdirSync(SRCPROJ).filter(d => fs.existsSync(path.join(SRCPROJ, d, "index.md")));
const tagPages = fs.existsSync(path.join(DIST, "tags"))
  ? fs.readdirSync(path.join(DIST, "tags")).filter(d => fs.existsSync(path.join(DIST, "tags", d, "index.html"))) : [];
const blogPages = fs.existsSync(path.join(DIST, "blog"))
  ? fs.readdirSync(path.join(DIST, "blog")).filter(d => fs.existsSync(path.join(DIST, "blog", d, "index.html"))) : [];
const projPages = fs.existsSync(path.join(DIST, "projects"))
  ? fs.readdirSync(path.join(DIST, "projects")).filter(d => fs.existsSync(path.join(DIST, "projects", d, "index.html"))) : [];

info.push(`routes total: ${routes.length}`);
info.push(`blog src/dst: ${blogDirs.length}/${blogPages.length}`);
info.push(`projects src/dst: ${projDirs.length}/${projPages.length}`);
info.push(`tag pages: ${tagPages.length}`);

const must = ["/", "/blog/", "/tags/", "/projects/", "/about/", "/404"];
for (const m of must) if (!routes.includes(m)) P("P1", `missing route ${m}`);
for (const r of routes) {
  if (r.startsWith("/work")) P("P1", `forbidden route ${r}`);
  for (const bad of ["hello-world", "typography-check", "welcome"]) if (r.includes(bad)) P("P1", `fixture/draft route leaked: ${r}`);
}
for (const d of blogDirs) if (!blogPages.includes(d)) P("P1", `blog not generated: ${d}`);
for (const d of projDirs) if (!projPages.includes(d)) P("P1", `project not generated: ${d}`);

// ---------- 4. Internal link + anchor crawl ----------
const allIds = {}; // route -> Set(ids)
const pageHtml = {};
for (const f of htmlFiles) {
  const route = "/" + path.relative(DIST, f).replace(/index\.html$/, "").replace(/\.html$/, "");
  const html = fs.readFileSync(f, "utf8");
  pageHtml[route] = html;
  allIds[route] = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
}
const routeExists = (r) => routes.includes(r);
let brokenLinks = 0, brokenAnchors = 0, checked = 0;
for (const [route, html] of Object.entries(pageHtml)) {
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(u)) continue;
    if (u.startsWith("#")) {
      checked++;
      const id = decodeURIComponent(u.slice(1));
      if (!allIds[route].has(id)) { brokenAnchors++; P("P2", `${route}: broken anchor ${u}`); }
      continue;
    }
    if (!u.startsWith("/")) continue;
    checked++;
    const [p, frag] = u.split("#");
    const norm = p.endsWith("/") ? p : p + "/";
    const isAsset = /\.(png|jpe?g|gif|webp|svg|css|js|ico|xml|txt|woff2?|pdf)$/i.test(p);
    if (isAsset) {
      if (!fs.existsSync(path.join(DIST, p))) { brokenLinks++; P("P2", `${route}: missing asset ${p}`); }
      continue;
    }
    if (!routeExists(norm)) { brokenLinks++; P("P1", `${route}: broken link ${u}`); continue; }
    if (frag) {
      const id = decodeURIComponent(frag);
      if (!allIds[norm]?.has(id)) { brokenAnchors++; P("P2", `${route}: broken anchor ${u}`); }
    }
  }
}
info.push(`links checked: ${checked}, broken links: ${brokenLinks}, broken anchors: ${brokenAnchors}`);

// ---------- 5. SEO ----------
let seoErr = 0;
for (const [route, html] of Object.entries(pageHtml)) {
  const need = ["<title>", 'name="description"', 'rel="canonical"', 'property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:image"', 'property="og:site_name"'];
  for (const n of need) if (!html.includes(n)) { seoErr++; P("P2", `${route}: missing ${n}`); }
  const head = html.slice(0, html.indexOf("</head>"));
  for (const bad of ["localhost", "127.0.0.1", "42.194.206.190", "github.io/hugo-blog", "holtwood.github.io/hugo-blog"]) {
    if (head.includes(bad)) { seoErr++; P("P1", `${route}: dev/old URL leak in <head> "${bad}"`); }
  }
}
info.push(`SEO field errors: ${seoErr}`);

// ---------- 6. RSS ----------
const rss = fs.readFileSync(path.join(DIST, "rss.xml"), "utf8");
const rssItems = (rss.match(/<item>/g) || []).length;
const rssBad = [...rss.matchAll(/<link>([^<]+)<\/link>/g)].map(m => m[1])
  .filter(u => !u.match(/^https:\/\/imshane\.site\/(blog\/.+\/|)$/));
if (rssItems !== 40) P("P1", `RSS items ${rssItems} != 40`);
if (rssBad.length) P("P1", `RSS non-blog links: ${rssBad.join(",")}`);
info.push(`RSS items: ${rssItems}`);

// ---------- 7. Sitemap ----------
const sm = fs.readFileSync(path.join(DIST, "sitemap-0.xml"), "utf8");
const smUrls = (sm.match(/<loc>/g) || []).length;
for (const bad of ["hello-world", "typography-check", "welcome"]) if (sm.includes(bad)) P("P1", `sitemap contains ${bad}`);
if (/<loc>https:\/\/imshane\.site\/work\/?<\/loc>/.test(sm)) P("P1", "sitemap contains /work route");
info.push(`sitemap urls: ${smUrls}`);

// ---------- 8/9. Blog & tags QA ----------
let tocCount = 0;
for (const d of blogPages) {
  const html = fs.readFileSync(path.join(DIST, "blog", d, "index.html"), "utf8");
  if (html.includes('class="animate toc')) tocCount++;
}
info.push(`posts with TOC: ${tocCount}`);
// tags bidirectional: article tags link /tags/x/ exists; tag page lists same count
const tagCountsSrc = {};
for (const d of blogDirs) {
  const { data } = matter(fs.readFileSync(path.join(SRCBLOG, d, "index.md"), "utf8"));
  for (const t of data.tags || []) tagCountsSrc[t] = (tagCountsSrc[t] || 0) + 1;
}
for (const [t, n] of Object.entries(tagCountsSrc)) {
  const f = path.join(DIST, "tags", t, "index.html");
  if (!fs.existsSync(f)) { P("P1", `missing tag page ${t}`); continue; }
  const html = fs.readFileSync(f, "utf8");
  const li = (html.match(/<li class="flex gap-4 items-baseline">/g) || []).length;
  if (li !== n) P("P2", `tag ${t}: src ${n} posts vs page ${li} rows`);
}
info.push(`distinct tags: ${Object.keys(tagCountsSrc).length}`);

// ---------- 10. Projects order + links ----------
const projIndex = fs.readFileSync(path.join(DIST, "projects", "index.html"), "utf8");
const order = ["cuflash", "tiny-llm", "paged-serving", "trifuse", "cuda-foundations", "cloud-bench", "site"];
let lastIdx = -1;
for (const slug of order) {
  const idx = projIndex.indexOf(`/projects/${slug}/`);
  if (idx === -1) { P("P1", `project missing in list: ${slug}`); continue; }
  if (idx < lastIdx) P("P1", `project order wrong: ${slug}`);
  lastIdx = idx;
}
const homeHtml = pageHtml["/"];
const featuredShown = ["cuflash", "tiny-llm", "paged-serving"].filter(s => homeHtml.includes(`/projects/${s}/`)).length;
const nonFeaturedShown = ["trifuse", "cuda-foundations", "cloud-bench", "/projects/site/"].filter(s => homeHtml.includes(`/projects/${s}/`)).length;
if (featuredShown !== 3) P("P1", `homepage featured != 3 (${featuredShown})`);
if (nonFeaturedShown !== 0) P("P1", `homepage shows non-featured project`);
const siteHtml = fs.readFileSync(path.join(DIST, "projects", "site", "index.html"), "utf8");
if (/href="[^"]*github\.com[^"]*imshane/i.test(siteHtml)) P("P1", "site project shows repoURL");
if (/demo/i.test(siteHtml.match(/<nav[\s\S]*?<\/nav>/)?.[0] || "")) P("P1", "site project shows demoURL");

// ---------- 11. Secret scan ----------
const secretPatterns = [
  [/ghp_[A-Za-z0-9]{20,}/, "github token ghp_"],
  [/github_pat_[A-Za-z0-9_]{20,}/, "github PAT"],
  [/sk-[A-Za-z0-9]{20,}/, "openai-style sk-"],
  [/BEGIN [A-Z ]*PRIVATE KEY/, "private key block"],
];
const scanTargets = [];
(function walkAll(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", ".git", "dist", ".astro"].includes(e.name)) walkAll(p); }
    else if (/\.(md|mdx|ts|tsx|astro|mjs|json|yml|yaml|html|xml|css)$/.test(e.name)) scanTargets.push(p);
  }
})(ROOT);
scanTargets.push(...htmlFiles);
let secretHits = 0;
for (const f of scanTargets) {
  const t = fs.readFileSync(f, "utf8");
  for (const [re, label] of secretPatterns) {
    if (re.test(t)) { secretHits++; P("P0", `${path.relative(ROOT, f)}: possible ${label} (location only)`); }
  }
}
// contextual password/token/secret: flag only obvious assignments
for (const f of scanTargets) {
  const t = fs.readFileSync(f, "utf8");
  for (const m of t.matchAll(/(password|token|secret|api[_-]?key)\s*[:=]\s*["']?([A-Za-z0-9_\-]{16,})/gi)) {
    secretHits++; P("P0", `${path.relative(ROOT, f)}: possible credential assignment "${m[1]}=…" (value not printed)`);
  }
}
for (const f of htmlFiles) {
  const t = fs.readFileSync(f, "utf8");
  for (const bad of ["42.194.206.190", "/home/ubuntu", "livesync", "memos.imshane"]) {
    if (t.includes(bad)) P("P1", `${path.relative(DIST, f)}: dist leaks "${bad}"`);
  }
}
info.push(`secret scan hits: ${secretHits}`);

// ---------- 12. Identity audit (site chrome only, not historical post bodies) ----------
for (const f of ["src/consts.ts", "src/components/Footer.astro", "src/components/Header.astro", "src/pages/about.astro"]) {
  const t = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const bad of ["jiashuaishi", "leetcode-cn.com/u", "jiashuai.shi@"]) {
    if (t.includes(bad)) P("P1", `${f}: stale identity "${bad}"`);
  }
}

// ---------- 13. External runtime resources ----------
let extFonts = 0, remoteImgs = 0, trackers = 0;
for (const [route, html] of Object.entries(pageHtml)) {
  for (const m of html.matchAll(/<link[^>]+href="(https?:[^"]+)"|<script[^>]+src="(https?:[^"]+)"/g)) {
    const u = m[1] || m[2];
    if (/fonts\.(googleapis|gstatic)/.test(u)) { extFonts++; P("P2", `${route}: external font ${u}`); }
    else if (/google-analytics|googletagmanager|umami|plausible|clarity|baidu/i.test(u)) { trackers++; P("P1", `${route}: tracker ${u}`); }
  }
  for (const m of html.matchAll(/<img[^>]+src="(https?:[^"]+)"/g)) { remoteImgs++; P("P2", `${route}: remote img ${m[1].slice(0, 80)}`); }
}
info.push(`external fonts: ${extFonts}, remote imgs: ${remoteImgs}, trackers: ${trackers}`);

// ---------- output ----------
console.log("== INFO =="); info.forEach(i => console.log("  " + i));
console.log("\n== ISSUES ==");
if (!issues.length) console.log("  none");
const bySev = { P0: 0, P1: 0, P2: 0, P3: 0 };
for (const i of issues) { bySev[i.sev]++; console.log(`  ${i.sev}  ${i.msg}`); }
console.log("\n== SEVERITY ==", JSON.stringify(bySev));
