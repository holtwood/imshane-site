# Phase 8 — Final Local QA Report

基准：Phase 7B commit `5070bd4` 之后的 HEAD（修复后重新验证）。

结论：**PASS**（P0=0, P1=0）

## 1. Build

| 项 | 结果 |
|---|---|
| `pnpm run build` | 成功，67 pages |
| `astro check` | 0 errors / 0 warnings / 0 hints |

## 2. Route Inventory（67 routes）

| 类型 | 数量 | 状态 |
|---|---|---|
| `/` `/blog/` `/tags/` `/projects/` `/about/` `/404` | 6 | ✓ |
| `/blog/{slug}/` | 40 | ✓ 与源目录一一对应 |
| `/tags/{tag}/` | 14 | ✓ |
| `/projects/{slug}/` | 7 | ✓ |
| 禁止路由（`/work`、fixture、demo） | 0 | ✓ 不存在 |

## 3. Content Integrity

| 项 | 期望 | 实际 |
|---|---|---|
| Blog 源 / 生成 | 40 / 40 | 40 / 40 ✓ |
| RSS items | 40 | 40 ✓ 全部 `https://imshane.site/blog/{slug}/` |
| Projects | 7 | 7 ✓ |
| Featured | 3 | 3 ✓（cuflash / tiny-llm / paged-serving）|
| Tags | — | **14**（见 Known Issues #1）|

## 4. Internal Link Crawl

- 检查 href/src/#anchor 共 **1360** 处
- broken internal link = **0**
- broken anchor = **0**（含 CJK heading slug）

## 5. SEO

- 67 个 HTML 页全量检查 `title / description / canonical / og:title / og:description / og:url / og:image / og:site_name`：缺失 **0**
- `<head>` 内无 localhost / 127.0.0.1 / 内网 IP / 旧 GitHub Pages URL

## 6–7. RSS / Sitemap

- RSS：40 items，仅 Blog
- Sitemap：66 URL（67 页减 404），无 draft / fixture / `/work`

## 8. Blog QA

- TOC：触发规则 `H2/H3 ≥ 4 或 阅读 ≥ 8min`，实际命中 **18/40**（重新统计确认）
- Prev/Next：按 date + slug 稳定排序，方向「较新 ← → 较旧」
- 标签可点击 → `/tags/{t}/`；分类保持纯文本
- 代码块 `overflow-x`、表格横向滚动、footnotes、图片本地化（14 张）、CJK 阅读时间（约 X 分钟）均正常
- 失效历史图（clouddn）以一行斜体注明 + HTML 注释保留原 URL，无 broken icon

## 9. Tags QA

- 14 个 tag archive，文章 → tag 页 → 文章双向计数一致（逐 tag 校验源数据计数 vs 页面行数）

## 10. Projects QA

- 顺序人工固定：cuflash → tiny-llm → paged-serving → trifuse → cuda-foundations → cloud-bench → imshane.site
- 首页 Selected Projects 仅 `featured: true` 的 3 个
- 6 个 GitHub URL 全部 `api.github.com` 200 验证通过
- `imshane.site` 项目页无 repo / demo 链接（无 404 外链）

## 11. 安全扫描

- 源 + dist 全量：`ghp_` / `github_pat_` / `sk-` / 私钥块 / 明文凭据赋值 = **0**
- dist 无内网 IP、本机路径、私有服务地址泄露

## 12. Identity Audit

- Header / Footer / About / consts 无 `jiashuaishi`、旧 email、旧 LeetCode profile
- 历史博文正文中的旧身份信息属历史内容，未改动

## 13. External Runtime Resources

- 外部字体 0（Inter/Lora 经 @fontsource 本地打包）
- 远程文章图片 0
- 第三方 JS / tracker 0

## 14. License

- `LICENSE`：Astro Nano MIT（Mark Horn）完整保留 ✓
- README 注明基于 Astro Nano（MIT）构建
- 旧博客正文无单独 license 声明需要迁移，无需额外处理

## 15–16. Responsive / Browser QA

- 视口：390×844 / 768×1024 / 1280 / 1440，Light + Dark
- Playwright smoke（11 页）：`console.error=0 pageerror=0 failedLocalReq=0`，全部 200

## 17. Accessibility

- TOC 用原生 `<details>/<summary>`，可键盘开合
- 主题切换三按钮均有 `aria-label`（Light/Dark/System theme）
- 全部 `<img>` 有 alt（部分为文件名，历史迁移所致，见 Known Issues #2）
- heading 层级 h1 唯一、TOC 收录 H2/H3

## 18–19. 架构与依赖

- Astro static output，无 server adapter / DB / React/Vue runtime
- 生产依赖即 Astro Nano 基线（astro、tailwind、mdx、rss、sitemap、fontsource、sharp 等）；`gray-matter`、`playwright` 在 devDependencies
- 注：eslint/typescript 位于 `dependencies`（Nano 原始模板如此），仅影响安装体积，不进入产物 → P3

## 20. Repository Cleanliness

- `dist/` `node_modules/` `.env` 均被 .gitignore
- 工作区除 QA 脚本与文档外干净，临时截图在 /tmp 未入库

## 21. README

- 已补齐：站点定位、技术栈、dev/build、内容目录结构、Hugo 迁移简述、纯静态部署原则
- 无任何 Secret

## Adversarial Re-check（二次对抗复查）

在自动化 QA 之外补充手工核查，发现并处理：

| 检查 | 结果 |
|---|---|
| TOC=18 是否误报 | ✓ 真实，确认为 `<details class="animate toc">` 容器逐篇命中 |
| site 项目页是否藏外链 | ✓ 仅 canonical/rss/footer 全局链接（GitHub 个人主页 + 备案），无项目 repo/demo 链接 |
| robots.txt | ✓ 存在，`Allow: /` + sitemap-index 引用正确（此前漏检，已补） |
| canonical / og:url 值 | ✓ 全站 `https://imshane.site/...`（此前只查"无坏值"，已补查"值正确"） |
| og:image 目标 | ✓ `public/og-default.png` → `dist/og-default.png` 真实存在 |
| 无 alt 的 `<img>` | 0（此前只正向统计有 alt 的，已补负向检查）|
| 私有仓库名泄露 | 0（due-noted / whenfree / worth-keeping / recipegrid / kvtier / cloud-bench-server 均不在 dist）|
| prev/next 覆盖 | 40/40 篇全有（此前只抽查）|
| featured 源数据 | 恰好 3 个 `featured: true`；order 1–7 无重复；blog/project 均无 draft |
| 阅读时间 | 40/40 篇均有「约 X 分钟」|

**发现并修复的回归**：`scripts/qa.mjs` 自身的未使用参数 `skip` 触发 `ts(6133)` hint（首次提交前 check 时被新增脚本引入）。已删除该参数，复跑 `astro check` 回到 0/0/0。

## Known Issues

| # | 级别 | 说明 |
|---|---|---|
| 1 | — | **实际 tag 数为 14 而非 15**。Phase 5 修复空 tag（`tags: -` → `[]`）后真实值为 14；此前报告中的"15"为修复前口径。数据与页面双向一致，非 bug |
| 2 | P3 | 部分迁移图片 alt 为文件名（如 `image-20220429200959593`），历史内容所致，语义可后续改进 |
| 3 | P3 | eslint/typescript 等 dev 工具在 `dependencies`（继承自 Nano 模板），无功能影响 |

## 结论

P0=0，P1=0，P2=0，P3=2 → **PASS**。可作为 Release Candidate 进入 Phase 9（生产环境审计与切换准备）。
