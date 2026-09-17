# Hugo → Astro 全量迁移报告（Phase 5 最终版）

- 迁移工具：`scripts/migrate.mjs`（契约见 `docs/content-migration.md`）
- 规则单一来源：`scripts/migration-rules.mjs`
- 人工摘要固化表：`scripts/descriptions.json`
- 校验工具：`scripts/verify-migration.mjs`
- 生成时间：Phase 5 完成时

## Summary

| 指标 | 数量 |
|------|------|
| 旧源文章（hugo-blog/content/post/*.md） | 40 |
| 迁移成功 | 37（Phase 5）+ 3（Phase 4 pilot）= 40 |
| 构建产物文章页（dist/blog/*/） | 40 |
| 失败 | 0 |
| 远程图片本地化 | 14 张 |
| Missing assets | 1（clouddn，详见下节） |
| 测试 fixture | 3 篇移至 `tests/fixtures/blog/`（不在 content collection） |

## 校验结果（verify-migration.mjs 全 PASS）

- legacy source 40 / 新 blog 目录 40 / dist 页面 40 —— 三方一致
- title 40/40 与旧 front matter 完全一致
- date 40/40 与旧 front matter 完全一致（无时区漂移）
- legacyUrl 40/40 正确（保留旧 slug 原始大小写与日期路径）
- 正文远程图片引用：**0**（残留 URL 仅存在于 HTML 注释中，不加载）
- heading 计数 40/40 无变化；code fence 计数 40/40 无变化
- old_url 40 条唯一；new_url 40 条唯一
- 幂等性：`--all` 重跑 → `migrated:0, skipped:40, images:0`

## Slug 特殊处理

| 源文件 | 旧 slug | 新 slug | 说明 |
|--------|---------|---------|------|
| 2022-04-29-my-resume-2022.04.29.md | my-resume | my-resume | 保留 |
| 2022-05-10-waiting-marlin.md | my-resume | waiting-marlin | slug 冲突，override（SLUG_OVERRIDES） |
| …-file-record-2-braveheart.md | file-record-2-Braveheart | file-record-2-braveheart | 大写 → lowercase |
| …-algo-problem-1-Inert-update-strategy.md | Inert-update-strategy | inert-update-strategy | 大写 → lowercase |

文件名与 front matter slug 不一致、以 fm 为准的：
`learn-go-gpm → go-gmp-design`、`learn-go-gc → go-gc-design`、`knowledge-points-interview-1 → knowledge-points-interviews`、`bugfix-1-strip-pre-path → record-bugfix-1-strip-pre-path`。

legacyUrl 全部按「fm.date + 原始 slug 大小写」生成，未经 lowercase 污染。

## Normalization 记录（18 条）

- categories `programing → programming`：16 篇
- categories `undefine → 移除`：1 篇（my-first-blog）
- tags 空项 `null → 移除`：1 篇（my-first-blog，YAML `tags:\n  -` 解析出 null）
- 其余 tags 仅 lowercase/trim/去重，无语义合并；`cpp` 保持 `cpp`

最终分布：categories = programming 16, problems 10, life 4, interests 4, work 3, learn 1, interviews 1；
tags Top：go 11, cpp 4, use 4, summary 4, optimize 3, algo 3, film 2, books 2, 其余各 1。

## 图片本地化（14/15 成功）

| 文章 | 数量 | 来源 |
|------|------|------|
| knowledge-points-interviews | 10 | s3.bmp.ovh |
| go-gmp-design | 2 | s3.bmp.ovh（原 `<img>` HTML 已转 `![]()`，zoom 样式舍弃） |
| go-gc-design | 1 | s3.bmp.ovh |
| algo-problem-3-double-contest-45 | 1 | assets.leetcode-cn.com（`![][5]` 引用式，孤儿 def 行已清理） |

全部经 HTTP 200 + `image/*` MIME + 非 HTML + 非空校验；统一命名 `image-NN.ext`；同 URL 去重只下载一次。

## Missing Asset（1）

- **文章**：code-optimize-2-table-drive-method
- **URL**：`http://qo1qkz2df.hn-bkt.clouddn.com/table-drived.png`（alt：表驱动法示意图）
- **尝试**：原 URL 直连 → 404；Wayback availability API → 429 限流（多次重试）；CDX 全域名查询 → 无快照；`web.archive.org/web/2020id_/...` 直接快照探测 → 404
- **结论**：不可恢复
- **正文处理**：原图位置替换为 `*原文章图片（表驱动法示意图）已失效，暂未找到可恢复版本。*` + HTML 注释保留原 URL 供未来找回；未删除上下文、未生成替代图

## Description（40/40 人工撰写并复核）

全部 40 篇 description 由阅读正文后手写，50–100 字中性事实摘要，固化于
`scripts/descriptions.json`；`migrate.mjs` 优先读取该表，`--force` 重跑不覆盖。
无 auto-generated/fallback 状态的正式文章。

## 正文完整性

- 仅允许的差异：图片 URL → 本地相对路径、`<img>` → `![]()`、孤儿引用式图片 def 行移除、缺失图说明替换
- 链接计数 delta 唯一处：algo-problem-3 `7 → 6`（被移除的 `[5]:` 图片 def，属预期）
- 无润色、无标题改写、无代码块语言标记补充（166 个无标记 fence 原样保留）
- 特殊语法已抽查渲染正常：GFM 表格（note-regular-expressions-1）、引用式链接（algo-problem-2/3、bugfix-1）、HTML img（go-gmp-design）、18KB 长文（knowledge-points-interviews）、单字符段（my-first-blog）

## RSS / Sitemap / 首页

- `dist/rss.xml`：40 个 `<item>`，URL 均为 `https://imshane.site/blog/{slug}/`，无 projects/work/draft/fixture
- `dist/sitemap-0.xml`：40 个 `/blog/{slug}/` URL，无 draft/fixture
- 首页 Latest Writing 显示真实最新 4 篇（2022-05-10 waiting-marlin 等，不伪造日期）
- /blog 按年份分组：2016/2019/2020/2021/2022，无空年份

## 迁移脚本缺陷修复记录

Phase 5 期间发现并修复：

1. `![][5]` 引用式图片被两个正则重复匹配 → 同图下载两次（image-01/02 同字节）。已合并匹配逻辑 + URL 级去重
2. 引用式图片本地化后 `[5]: <remote>` 定义行残留远程 URL。已加孤儿 def 清理（保留仍被普通链接使用的 def）
3. YAML `tags:\n  -` 空项解析为 `null` → `String(null)` 变成 "null" tag。已在 String() 前过滤空值并记录 normalization

## 逐篇 URL 映射

见 `old-url-map.csv`（40 行 + header，含 source_file/old_slug/new_slug/old_url/new_url/title）。
