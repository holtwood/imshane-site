#!/usr/bin/env node
// 迁移结果校验：src/dst/dist 覆盖、title/date/legacyUrl、slug 映射、
// 正文结构完整性（heading/fence/link 计数）、代码块内容、远程图片、URL 唯一性。
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { normalizeSlug, SLUG_OVERRIDES, legacyPostUrl } from "./migration-rules.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.resolve(ROOT, "../hugo-blog/content/post");
const DST = path.resolve(ROOT, "src/content/blog");
const DIST = path.resolve(ROOT, "dist/blog");

if (!fs.existsSync(SRC)) {
  console.error(`missing Hugo source: ${SRC}`);
  console.error("checkout holtwood/hugo-blog next to this repository first");
  process.exit(2);
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith(".md")).sort();
const R = { checks: [], perPost: [], warnings: [] };
const ok = (name, pass, detail = "") => R.checks.push({ name, pass, detail });

const mapRows = [];
let catCount = {}, tagCount = {}, remoteImg = [], headingsDiff = [], fenceDiff = [], fenceContentDiff = [], linkDiff = [];
let titleOk = 0, dateOk = 0, legacyOk = 0;

const fenceBlocks = (body) =>
  [...body.replace(/\r\n/g, "\n").matchAll(/^```[^\n]*\n([\s\S]*?)^```\s*$/gm)].map(m => m[1]);

for (const file of files) {
  const { data: ofm, content: obody } = matter(fs.readFileSync(path.join(SRC, file), "utf8"));
  const rawSlug = String(ofm.slug ?? "").trim();
  const newSlug = SLUG_OVERRIDES[file] ?? normalizeSlug(rawSlug);
  const date = String(ofm.date).slice(0, 10);
  const oldUrl = legacyPostUrl(new Date(date), rawSlug);
  const newUrl = `/blog/${newSlug}/`;
  mapRows.push({ oldUrl, newUrl, title: ofm.title });

  const dstFile = path.join(DST, newSlug, "index.md");
  if (!fs.existsSync(dstFile)) { R.warnings.push(`${file}: missing target ${newSlug}`); continue; }
  const { data: nfm, content: nbody } = matter(fs.readFileSync(dstFile, "utf8"));

  if (nfm.title === ofm.title) titleOk++; else R.warnings.push(`${newSlug}: title changed "${ofm.title}" -> "${nfm.title}"`);
  if (String(nfm.date).slice(0, 10) === date) dateOk++; else R.warnings.push(`${newSlug}: date ${date} -> ${nfm.date}`);
  if (nfm.legacyUrl === oldUrl) legacyOk++; else R.warnings.push(`${newSlug}: legacyUrl "${nfm.legacyUrl}" != "${oldUrl}"`);

  for (const c of nfm.categories || []) catCount[c] = (catCount[c] || 0) + 1;
  for (const t of nfm.tags || []) tagCount[t] = (tagCount[t] || 0) + 1;

  // 远程图片引用（排除 HTML 注释中的 missing 记录）
  const bodyNoComment = nbody.replace(/<!--[\s\S]*?-->/g, "");
  const remotes = [...bodyNoComment.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)[^)]*\)/g)].map(m => m[1]);
  const remoteDefs = [...bodyNoComment.matchAll(/^\s*\[[^\]]*\]:\s*(https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg))\s*$/gim)].map(m => m[1]);
  if (remotes.length || remoteDefs.length) remoteImg.push({ newSlug, remotes, remoteDefs });

  const count = (s, re) => (s.match(re) || []).length;
  const hO = count(obody, /^#{1,6} /gm), hN = count(nbody, /^#{1,6} /gm);
  const fO = count(obody, /^```/gm), fN = count(nbody, /^```/gm);
  const lO = count(obody, /\[[^\]]*\]\((?!.*\.(?:png|jpe?g|gif|webp))[^)]*\)/g) + count(obody, /^\s*\[[^\]]*\]:\s*\S+/gm);
  const lN = count(nbody, /\[[^\]]*\]\((?!.*\.(?:png|jpe?g|gif|webp))[^)]*\)/g) + count(nbody, /^\s*\[[^\]]*\]:\s*\S+/gm);
  if (hN < hO) headingsDiff.push(`${newSlug}: headings ${hO} -> ${hN}`);
  else if (hN > hO) R.warnings.push(`${newSlug}: headings enriched ${hO} -> ${hN}`);
  if (fN < fO) fenceDiff.push(`${newSlug}: fences ${fO} -> ${fN}`);
  else if (fN > fO) R.warnings.push(`${newSlug}: fences enriched ${fO} -> ${fN}`);

  const oldFences = fenceBlocks(obody), newFences = fenceBlocks(nbody);
  const shared = Math.min(oldFences.length, newFences.length);
  for (let i = 0; i < shared; i++) {
    if (oldFences[i] !== newFences[i]) {
      fenceContentDiff.push(`${newSlug}: fence block ${i + 1} content changed`);
      break;
    }
  }

  const linkDelta = lO - lN;
  if (linkDelta !== 0) linkDiff.push(`${newSlug}: linkish ${lO} -> ${lN} (delta ${linkDelta})`);
  R.perPost.push({ file, newSlug, headings: `${hO}->${hN}`, fences: `${fO}->${fN}`, links: `${lO}->${lN}` });
}

const expected = files.length;
const sourceSlugs = mapRows.map(r => r.newUrl.slice("/blog/".length, -1));
const oldUrls = mapRows.map(r => r.oldUrl), newUrls = mapRows.map(r => r.newUrl);
const urlMapText = mapRows.map(r => `${r.oldUrl},${r.newUrl},"${String(r.title).replace(/"/g, '""')}"`).join("\n");

ok("legacy source count > 0", expected > 0, `${expected}`);
ok("dst contains every source post", sourceSlugs.every(s => fs.existsSync(path.join(DST, s, "index.md"))), `${sourceSlugs.length} slugs`);
ok("dist contains every migrated post", sourceSlugs.every(s => fs.existsSync(path.join(DIST, s, "index.html"))), `${sourceSlugs.length} slugs`);
ok(`title ${expected}/${expected} unchanged`, titleOk === expected, `${titleOk}/${expected}`);
ok(`date ${expected}/${expected} unchanged`, dateOk === expected, `${dateOk}/${expected}`);
ok(`legacyUrl ${expected}/${expected} correct`, legacyOk === expected, `${legacyOk}/${expected}`);
ok("no remote image refs in body", remoteImg.length === 0, remoteImg.length ? JSON.stringify(remoteImg) : "0");
ok("headings not lost", headingsDiff.length === 0, headingsDiff.join(" | ") || "all match");
ok("code fences not lost", fenceDiff.length === 0, fenceDiff.join(" | ") || "all match");
ok("code fence contents unchanged", fenceContentDiff.length === 0, fenceContentDiff.join(" | ") || "all match");
ok("old_url unique", new Set(oldUrls).size === expected, `${new Set(oldUrls).size}/${expected}`);
ok("new_url unique", new Set(newUrls).size === expected, `${new Set(newUrls).size}/${expected}`);

console.log("== CHECKS ==");
for (const c of R.checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
if (linkDiff.length) { console.log("\n== LINK DELTAS (informational) =="); linkDiff.forEach(d => console.log(" ", d)); }
if (R.warnings.length) { console.log("\n== WARNINGS =="); R.warnings.forEach(w => console.log(" ", w)); }
console.log("\n== CATEGORY STATS ==", JSON.stringify(catCount));
console.log("== TAG STATS ==", JSON.stringify(Object.fromEntries(Object.entries(tagCount).sort((a, b) => b[1] - a[1]))));
console.log("\n== URL MAP CSV ==\nold_url,new_url,title (rows: " + mapRows.length + ")");
fs.writeFileSync(path.join(ROOT, "old-url-map.csv"),
  "old_url,new_url,title\n" + urlMapText + "\n");
console.log("old-url-map.csv rewritten");

process.exitCode = R.checks.some(c => !c.pass) ? 1 : 0;
