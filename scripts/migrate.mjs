#!/usr/bin/env node
// Hugo -> Astro 博客迁移工具（契约见 docs/content-migration.md）
//
//   node scripts/migrate.mjs --dry-run            # 全量预演，不写文件
//   node scripts/migrate.mjs --slug <newSlug>     # 迁单篇
//   node scripts/migrate.mjs --all                # 全量
//   node scripts/migrate.mjs --slug x --force     # 覆盖已存在的目标
//
// 默认不覆盖已存在的目标文件；幂等可重复执行；旧仓库只读。

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  normalizeCategory,
  normalizeTag,
  normalizeSlug,
  SLUG_OVERRIDES,
  legacyPostUrl,
} from "./migration-rules.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.resolve(ROOT, "../hugo-blog/content/post");
const DST = path.resolve(ROOT, "src/content/blog");
const REPORT = path.resolve(ROOT, "migration-report.md");
const URLMAP = path.resolve(ROOT, "old-url-map.csv");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ALL = args.includes("--all");
const FORCE = args.includes("--force");
const ONLY_SLUGS = args
  .flatMap((a, i) => (a === "--slug" ? [args[i + 1]] : []))
  .flatMap(s => String(s).split(","))
  .filter(Boolean);

const EXT_BY_MIME = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const stats = {
  total: 0, migrated: 0, skipped: 0, failed: 0,
  images: [], missingAssets: [], normalizations: [], autoDescriptions: [],
  errors: [],
};

function parseArgs() {
  if (!DRY_RUN && !ALL && !ONLY_SLUGS.length) {
    console.error("需要 --dry-run / --slug <slug[,slug...]> / --all 之一");
    process.exit(2);
  }
}

function firstParagraph(body) {
  for (const block of body.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || t.startsWith("#") || t.startsWith("```") || t.startsWith("!") ||
        t.startsWith("<") || t.startsWith(">") || /^[-*+] |\d+\. /.test(t)) continue;
    return t.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/[*_`#]/g, "")
            .replace(/\s+/g, " ")
            .trim();
  }
  return "";
}

function fallbackDescription(body) {
  const p = firstParagraph(body);
  return p.length > 100 ? p.slice(0, 99) + "…" : p;
}

// <img src=".." alt=".." style="..">  ->  ![alt](src)
function convertHtmlImgs(body) {
  return body.replace(/<img\s+([^>]*?)\/?>/g, (m, attrs) => {
    const src = (attrs.match(/src="([^"]*)"/) || [])[1];
    const alt = (attrs.match(/alt="([^"]*)"/) || [])[1] || "";
    if (!src) return m;
    return `![${alt}](${src})`;
  });
}

// 收集引用式链接定义 [n]: url，供 ![][n] / ![a][n] 解析
function linkDefs(body) {
  const defs = {};
  for (const m of body.matchAll(/^\s*\[([^\]]+)\]:\s*(\S+)/gm)) {
    defs[m[1]] = m[2];
  }
  return defs;
}

function isRemote(u) { return /^https?:\/\//.test(u); }

async function downloadImage(url, dstDir, index) {
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!res.ok) return { ok: false, status: res.status };
  const mime = (res.headers.get("content-type") || "").split(";")[0].trim();
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) return { ok: false, status: "empty" };
  if (mime.startsWith("text/html") || buf.subarray(0, 15).toString().match(/^\s*</))
    return { ok: false, status: "not-image(html)" };
  if (!mime.startsWith("image/")) return { ok: false, status: `not-image(${mime})` };

  const urlExt = path.extname(new URL(url).pathname).toLowerCase();
  const ext = EXT_BY_MIME[mime] || (/^\.(png|jpe?g|gif|webp|svg)$/.test(urlExt) ? urlExt : ".bin");
  const name = `image-${String(index).padStart(2, "0")}${ext}`;
  fs.writeFileSync(path.join(dstDir, name), buf);
  return { ok: true, name, mime, bytes: buf.length };
}

function collectImageRefs(body, defs) {
  const refs = []; // {raw, alt, url}
  for (const m of body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g))
    refs.push({ raw: m[0], alt: m[1], url: m[2] });
  for (const m of body.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) {
    const url = defs[m[2]] || defs[m[1]];
    if (url) refs.push({ raw: m[0], alt: m[1], url });
  }
  for (const m of body.matchAll(/!\[\]\[([^\]]+)\]/g)) {
    const url = defs[m[1]];
    if (url) refs.push({ raw: m[0], alt: "", url });
  }
  return refs;
}

async function migratePost(file) {
  const srcPath = path.join(SRC, file);
  const raw = fs.readFileSync(srcPath, "utf8");
  const { data: fm, content: bodyRaw } = matter(raw);
  const base = { file, title: fm.title };

  const rawSlug = String(fm.slug ?? "").trim();
  if (!rawSlug) { stats.failed++; stats.errors.push({ ...base, error: "missing slug" }); return; }
  const newSlug = SLUG_OVERRIDES[file] ?? normalizeSlug(rawSlug);
  const date = String(fm.date).slice(0, 10);
  const legacyUrl = legacyPostUrl(new Date(date), rawSlug);

  const categories = (fm.categories || [])
    .map(c => {
      const n = normalizeCategory(String(c));
      if (n !== String(c).trim()) stats.normalizations.push({ file, field: "categories", from: c, to: n });
      return n;
    })
    .filter(Boolean);
  const seenTags = new Set();
  const tags = (fm.tags || [])
    .map(t => {
      const orig = String(t);
      const n = normalizeTag(orig);
      if (n !== orig) stats.normalizations.push({ file, field: "tags", from: orig, to: n });
      return n;
    })
    .filter(t => {
      if (!t) return false;
      if (seenTags.has(t)) { stats.normalizations.push({ file, field: "tags", from: t, to: "(dup removed)" }); return false; }
      seenTags.add(t); return true;
    });

  const dstDir = path.join(DST, newSlug);
  const dstFile = path.join(dstDir, "index.md");
  const exists = fs.existsSync(dstFile);
  if (exists && !FORCE) {
    stats.skipped++;
    stats.errors.push({ ...base, newSlug, error: "exists (use --force to overwrite)" });
    return;
  }

  let body = convertHtmlImgs(bodyRaw);
  const defs = linkDefs(body);
  const refs = collectImageRefs(body, defs).filter(r => isRemote(r.url));

  if (DRY_RUN) {
    stats.migrated++;
    for (const r of refs) stats.images.push({ file, newSlug, url: r.url, local: "(dry-run)" });
    return;
  }

  fs.mkdirSync(dstDir, { recursive: true });
  let i = 0;
  for (const r of refs) {
    i++;
    const dl = await downloadImage(r.url, dstDir, i);
    if (dl.ok) {
      const md = `![${r.alt}](./${dl.name})`;
      body = body.split(r.raw).join(md);
      stats.images.push({ file, newSlug, url: r.url, local: `${newSlug}/${dl.name}`, bytes: dl.bytes });
    } else {
      stats.missingAssets.push({ file, newSlug, url: r.url, status: dl.status, alt: r.alt });
    }
  }

  const description = fallbackDescription(body);
  stats.autoDescriptions.push({ newSlug, description });

  const out = matter.stringify(body.replace(/\n{3,}/g, "\n\n").trim() + "\n", {
    title: fm.title,
    description,
    date,
    tags,
    categories,
    legacyUrl,
  });
  fs.writeFileSync(dstFile, out);
  stats.migrated++;
}

function buildUrlMap(files) {
  const rows = ["old_url,new_url,title"];
  for (const file of files) {
    const { data: fm } = matter(fs.readFileSync(path.join(SRC, file), "utf8"));
    const rawSlug = String(fm.slug ?? "").trim();
    const newSlug = SLUG_OVERRIDES[file] ?? normalizeSlug(rawSlug);
    const date = String(fm.date).slice(0, 10);
    rows.push(`${legacyPostUrl(new Date(date), rawSlug)},/blog/${newSlug}/,"${String(fm.title).replace(/"/g, '""')}"`);
  }
  return rows.join("\n") + "\n";
}

function writeReport(files) {
  const L = [];
  L.push(`# Migration Report`, ``);
  L.push(`- 时间: ${new Date().toISOString()}`);
  L.push(`- 模式: ${DRY_RUN ? "dry-run" : "write"}${FORCE ? " +force" : ""}`);
  L.push(`- 源文章总数: ${files.length}`);
  L.push(`- 迁移成功: ${stats.migrated}`);
  L.push(`- 跳过(已存在): ${stats.skipped}`);
  L.push(`- 失败: ${stats.failed}`);
  L.push(``);
  if (stats.images.length) {
    L.push(`## 图片本地化 (${stats.images.length})`, ``);
    for (const i of stats.images) L.push(`- ${i.newSlug}: ${i.url} -> ${i.local}${i.bytes ? ` (${i.bytes}B)` : ""}`);
    L.push(``);
  }
  if (stats.missingAssets.length) {
    L.push(`## Missing Assets (${stats.missingAssets.length})`, ``);
    for (const m of stats.missingAssets)
      L.push(`- ${m.newSlug}: ${m.url} — status: ${m.status} (alt: ${m.alt})`);
    L.push(``);
  }
  if (stats.normalizations.length) {
    L.push(`## Normalization (${stats.normalizations.length})`, ``);
    for (const n of stats.normalizations)
      L.push(`- ${n.file} ${n.field}: ${JSON.stringify(n.from)} -> ${JSON.stringify(n.to)}`);
    L.push(``);
  }
  if (stats.autoDescriptions.length) {
    L.push(`## Auto-generated descriptions（待人工确认）`, ``);
    for (const d of stats.autoDescriptions) L.push(`- ${d.newSlug}: ${d.description}`);
    L.push(``);
  }
  if (stats.errors.length) {
    L.push(`## Errors / Skips`, ``);
    for (const e of stats.errors) L.push(`- ${e.file}: ${e.error}${e.newSlug ? ` (-> ${e.newSlug})` : ""}`);
    L.push(``);
  }
  fs.writeFileSync(REPORT, L.join("\n"));
}

async function main() {
  parseArgs();
  const files = fs.readdirSync(SRC).filter(f => f.endsWith(".md")).sort();
  stats.total = files.length;

  let targets = files;
  if (ONLY_SLUGS.length) {
    targets = files.filter(f => {
      const { data: fm } = matter(fs.readFileSync(path.join(SRC, f), "utf8"));
      const raw = String(fm.slug ?? "").trim();
      const keys = [raw, normalizeSlug(raw), SLUG_OVERRIDES[f], f.replace(/\.md$/, ""), f];
      return ONLY_SLUGS.some(s => keys.includes(s));
    });
    if (targets.length !== ONLY_SLUGS.length) {
      console.error(`匹配 ${targets.length}/${ONLY_SLUGS.length} 篇，请检查 slug`);
      process.exit(2);
    }
  }

  for (const f of targets) await migratePost(f);
  if (!DRY_RUN) {
    fs.writeFileSync(URLMAP, buildUrlMap(files));
    writeReport(files);
  }
  console.log(JSON.stringify({ total: files.length, ...stats, images: `${stats.images.length} downloaded`, missing: stats.missingAssets.length }, null, 0)
    .replace(/"(images|missingAssets|normalizations|autoDescriptions|errors)":\[[^\]]*\]/g, '"$1":[...]'));
}

main();
