# Content Migration Contract

Phase 4 迁移脚本（`scripts/migrate.mjs`）必须遵守的输入/输出契约。规则已与站点所有者确认，修改前先讨论。

## 输入

- 源仓库：`../hugo-blog`（Hugo + hugo-xmin，已归档，只读）
- 文章：`../hugo-blog/content/post/*.md`，共 **40 篇**（以文件数为准；README 中"43 篇"为历史统计误差）
- 全部为纯 Markdown，无 `.Rmd` 正文；无 Hugo shortcode；无 draft；无数学公式

## 输出

- 目标：`src/content/blog/{slug}/index.md`（page bundle 模式，图片与文章同目录）
- URL：`/blog/{slug}/`

## 字段映射

| Hugo front matter | Astro front matter | 规则 |
|---|---|---|
| `title` | `title` | 原样 |
| `date` | `date` | 原样（ISO 日期）|
| `slug` | 目录名 `{slug}` | `normalizeSlug()`：trim + 小写；冲突走 `SLUG_OVERRIDES` |
| `categories[]` | `categories[]` | `normalizeCategory()`：`programing→programming`，`undefine` 删除，其余原样 |
| `tags[]` | `tags[]` | `normalizeTag()`：trim + 小写 + 去空；**不做语义重命名**（`cpp` 保持 `cpp`）|
| — | `description` | **生成**：读正文手写 50–100 字中性摘要，不使用营销语言 |
| — | `legacyUrl` | **生成**：`/post/YYYY/MM/DD/{原slug}/`（注意用**原始 slug**，含大写）|

规范化逻辑集中在 `scripts/migration-rules.mjs`，脚本直接 import，不要在脚本里再写一份规则。

## Slug 规则

- 新 slug = 目录名 = 最终 URL
- 一律小写（`file-record-2-Braveheart` → `file-record-2-braveheart`，`Inert-update-strategy` → `inert-update-strategy`）
- **已知冲突**：`2022-04-29-my-resume.md` 保留 `my-resume`；`2022-05-10-waiting-marlin.md`（原 slug 也是 `my-resume`）→ `waiting-marlin`
- 不得根据 title 自动生成 slug（尤其不允许拼音化中文标题）

## 正文

**禁止**改写正文语义：不重写、不润色、不删除"过时"内容、不自动改旧文章观点。

允许的机械修复：

- Markdown 语法兼容（未标记语言的代码围栏可视上下文补 `lang`）
- 外链图片 → 下载到文章目录并改为相对引用（见下）
- 裸 HTML `<img>` → Markdown `![]()` 或保留（`style="zoom:80%"` 这类非标样式可丢弃）
- 明显死链在原位保留并记入迁移日志（不删正文）

## 图片与静态资源

- `s3.bmp.ovh` 等外链图：**下载到 `src/content/blog/{slug}/`**，引用改为 `./filename.png`
- 下载必须**绕过本机代理**（`curl --noproxy '*'` / 脚本内禁用 proxy env），代理出口访问 bmp.ovh 会失败
- 已失效资源（如 `qo1qkz2df.hn-bkt.clouddn.com`）：先试 Wayback Machine；无法恢复则**保留原始链接**并在 `migration-report.md` 记录 missing asset，不凭空造图
- `hugo-blog/static/` 下 2 张 PNG 为孤儿资源（无文章引用），不迁移

## 产物

- `migration-report.md`：文章总数 / 成功 / 失败 / 警告 / 缺图清单 / category·tag 原值→规范值映射
- `old-url-map.csv`：`old_url,new_url,title`（old_url 形如 `/post/2020/06/15/code-optimize-1-simd/`）

## 验收

- 40 篇全部生成页面；draft 逻辑不适用于历史文章（它们都不是 draft）
- 构建无错误；`astro check` 干净
- RSS/sitemap 仅含新 URL
