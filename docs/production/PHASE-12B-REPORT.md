# Phase 12B — Final Main Site Cutover（执行报告）

执行时间：2026-09-17 16:12（UTC+8）。结果：**PASS —— imshane.site 已正式切换为 Astro 静态站「简说技术」。**

## 执行链路

1. 8-host baseline 与 Phase 11 一致；`/srv/current` → `releases/20260917-1503-abc40bf`
2. 最终备份 `Caddyfile.bak.20260917-1610`
3. `cp Caddyfile.phase12.candidate Caddyfile`（逐字节一致）
4. `caddy validate` → **Valid configuration**
5. `caddy reload` → adapted + loaded，**热加载零 recreate**
6. 全量 cutover QA —— 全部通过

## Apex `imshane.site` 验证

| 路径 | 结果 |
|---|---|
| `/` | 200，title `简说技术 \| Shane's Personal Site`，canonical=`https://imshane.site/` |
| `/blog/` + 3 篇历史文 | 200 ×4 |
| `/tags/` `/tags/go/` | 200 ×2 |
| `/projects/` `/projects/cuflash/` | 200 ×2 |
| `/about/` | 200 |
| `/rss.xml` `/robots.txt` `/sitemap-index.xml` | 200，正确 MIME |
| `/definitely-does-not-exist` | **HTTP 404** + Astro「404 \| 简说技术」页 ✓ |
| `/_astro/*`、字体、CSS | 全部 200（Playwright 实测）|
| 生产环境 console.error / pageerror / 资源失败 | **0 / 0 / 0**（Playwright 对真实 https://imshane.site 三页实测）|

## `www.imshane.site`

- `http://www/abc?x=1` → 308 → `https://www/abc?x=1`（Caddy 自动 HTTPS）
- `https://www/abc?x=1` → **301** → `https://imshane.site/abc?x=1` —— **path 与 query 完整保留，无 loop**

## `memos.imshane.site` 回归

`/` 200 · `/auth` 200 · `/api/v1/instance/profile` 200 JSON —— 与 Phase 11 完全一致，无 502/503。

## 其他 5 vhost 回归

sync 403 · vault 200 · newapi 200 · linkding 302 · radicale 302 —— **5/5 PASS** 与 baseline 一致。

## 基础设施

- Caddy：`de234bae…` **ID 不变**，Restarts=0，healthy
- memos `48991a56` / mortis `9005391d` / couchdb `ad156a76`：**全部未动**
- TLS：apex 证书原样有效（LE → 2026-12-08），无新签发
- Caddy 日志 error=0

## 中断

**0 秒** —— `caddy reload` 热加载，无连接中断（Phase 10B 的 ~2s recreate 是整个迁移中唯一的停机）。

## Rollback

未触发。预案：`cp Caddyfile.bak.20260917-1610 Caddyfile` → validate → reload（即回 Phase 11 态）。

## 最终生产拓扑

```text
imshane.site       → /srv/current (Astro dist, file_server)      ← 新
www.imshane.site   → 301 → https://imshane.site{uri}             ← 新
memos.imshane.site → mortis:5231(/api/v1,/o/r) + memos:5230      ← 不变
sync/vault/newapi/linkding/radicale                              ← 不变
```

## Adversarial Re-check（二次对抗复查）

切换后对**生产环境**追加检查，未在首轮验证中覆盖的角度：

| 检查 | 结果 |
|---|---|
| apex 残留 Memos 反代？ | ✓ 无——`imshane.site/api/v1/*`、`/o/r/*` 现在返回**静态 404**；memos 子域对应路径仍正常路由。隐藏代理零残留 |
| 无尾斜杠路径 | `/blog` → 308 `/blog/`；`/projects/cuflash` → 308 `.../`（file_server canonical，正确）|
| Server 头 | `header -Server` 生效，响应无 Server 字段 |
| 压缩 | `/_astro/*.css` gzip 正常 + ETag |
| live RSS | 40 items、`https://imshane.site/blog/...` 链接、`简说技术 — Blog`（初查 `grep -c` 误报 1 为单行 XML 行计数问题，已复核）|
| 首页指纹 | `Latest Writing` / `Selected Projects` 存在，非 Memos |
| `www` 双跳 | `http://www` →308→ `https://www` →301→ apex：Caddy 自动 HTTPS 决定的两跳，标准行为 |

**复查发现的已知限制（P3，非 bug，功能冻结不修）**：

- `/_astro/*` 哈希资产无 `Cache-Control: immutable`（仅 ETag）——重复访问缓存次优，未来 Caddyfile 迭代可补
- 无 HSTS 头——与切换前一致（无回归），可选的后续加固项
- 旧 `imshane.site/o/r/*` 公共附件链接在 apex 上 404——切换的固有行为变更，Memos 唯一入口为子域（用户已确认客户端迁移）

## Blockers

P0=0，P1=0，P2=0，P3=0（3 条 P3 观察记录于上表，均为非阻断项）。

## Administrative Checkpoint

用户已 ACK：切换完成后由其自行办理腾讯云备案「变更服务」与后续公安联网备案。Agent 不代办。
