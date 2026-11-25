// 生成 dist/urls.txt：百度站长「普通收录-API提交」使用的纯文本 URL 清单（每行一条）
// 输入：dist/sitemap-0.xml（astro sitemap 集成产物）
import fs from "node:fs";

const sitemapPath = new URL("../dist/sitemap-0.xml", import.meta.url);
const outPath = new URL("../dist/urls.txt", import.meta.url);

const xml = fs.readFileSync(sitemapPath, "utf8");
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (urls.length === 0) {
  throw new Error("sitemap-0.xml 未提取到任何 <loc>");
}

fs.writeFileSync(outPath, urls.join("\n") + "\n");
console.log(`urls.txt: ${urls.length} urls`);
