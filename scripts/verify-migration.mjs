#!/usr/bin/env node
// 迁移结果校验：src/dst/dist 数量、title/date 40/40、slug 映射、
// 正文结构完整性（heading/fence/link 计数）、远程图片审计、URL 唯一性。
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { normalizeSlug, SLUG_OVERRIDES, legacyPostUrl } from "./migration-rules.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.resolve(ROOT, "../hugo-blog/content/post");
const DST = path.resolve(ROOT, "src/content/blog");
const DIST = path.resolve(ROOT, "dist/blog");

const files = fs.readdirSync(SRC).filter(f => f.endsWith(".md")).sort();
const R = { checks: [], perPost: [], warnings: [] };
const ok = (name, pass, detail = "") => R.checks.push({ name, pass, detail });

const mapRows = [["source_file", "old_slug", "new_slug", "old_url", "new_url", "title"]];
let catCount = {}, tagCount = {}, remoteImg = [], headingsDiff = [], fenceDiff = [], linkDiff = [];
let titleOk = 0, dateOk = 0, legacyOk = 0;

for (const file of files) {
  const { data: ofm, content: obody } = matter(fs.readFileSync(path.join(SRC, file), "utf8"));
  const rawSlug = String(ofm.slug ?? "").trim();
  const newSlug = SLUG_OVERRIDES[file] ?? normalizeSlug(rawSlug);
  const date = String(ofm.date).slice(0, 10);
  const oldUrl = legacyPostUrl(new Date(date), rawSlug);
  mapRows.push([file, rawSlug, newSlug, oldUrl, `/blog/${newSlug}/`, ofm.title]);

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
  if (hO !== hN) headingsDiff.push(`${newSlug}: headings ${hO} -> ${hN}`);
  if (fO !== fN) fenceDiff.push(`${newSlug}: fences ${fO} -> ${fN}`);
  const linkDelta = lO - lN;
  if (linkDelta !== 0) linkDiff.push(`${newSlug}: linkish ${lO} -> ${lN} (delta ${linkDelta})`);
  R.perPost.push({ file, newSlug, headings: `${hO}->${hN}`, fences: `${fO}->${fN}`, links: `${lO}->${lN}` });
}

const distDirs = fs.existsSync(DIST) ? fs.readdirSync(DIST).filter(d => fs.existsSync(path.join(DIST, d, "index.html"))) : [];
const urlMapText = mapRows.slice(1).map(r => `${r[3]},${r[4]},"${String(r[5]).replace(/"/g, '""')}"`).join("\n");
const oldUrls = mapRows.slice(1).map(r => r[3]), newUrls = mapRows.slice(1).map(r => r[4]);

ok("legacy source count = 40", files.length === 40, `${files.length}`);
ok("dst blog dirs = 40", fs.readdirSync(DST).filter(d => fs.existsSync(path.join(DST, d, "index.md"))).length === 40);
ok("dist blog pages = 40", distDirs.length === 40, `${distDirs.length}`);
ok("title 40/40 unchanged", titleOk === 40, `${titleOk}/40`);
ok("date 40/40 unchanged", dateOk === 40, `${dateOk}/40`);
ok("legacyUrl 40/40 correct", legacyOk === 40, `${legacyOk}/40`);
ok("no remote image refs in body", remoteImg.length === 0, remoteImg.length ? JSON.stringify(remoteImg) : "0");
ok("headings unchanged", headingsDiff.length === 0, headingsDiff.join(" | ") || "all match");
ok("code fences unchanged", fenceDiff.length === 0, fenceDiff.join(" | ") || "all match");
ok("old_url unique", new Set(oldUrls).size === 40);
ok("new_url unique", new Set(newUrls).size === 40);

console.log("== CHECKS ==");
for (const c of R.checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
if (linkDiff.length) { console.log("\n== LINK DELTAS (informational) =="); linkDiff.forEach(d => console.log(" ", d)); }
if (R.warnings.length) { console.log("\n== WARNINGS =="); R.warnings.forEach(w => console.log(" ", w)); }
console.log("\n== CATEGORY STATS ==", JSON.stringify(catCount));
console.log("== TAG STATS ==", JSON.stringify(Object.fromEntries(Object.entries(tagCount).sort((a, b) => b[1] - a[1]))));
console.log("\n== URL MAP CSV ==\nsource_file,old_slug,new_slug,old_url,new_url,title (rows: " + (mapRows.length - 1) + ")");
fs.writeFileSync(path.join(ROOT, "old-url-map.csv"),
  "source_file,old_slug,new_slug,old_url,new_url,title\n" + urlMapText + "\n");
console.log("old-url-map.csv rewritten with full columns");
