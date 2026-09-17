# Phase 12A — Prepare Final Cutover Candidate（执行报告）

执行时间：2026-09-17 16:05（UTC+8）。**零生产变更**：仅生成独立 candidate 文件并用容器内 Caddy 2.11.4 做离线 validate/adapt。未 reload、未动 Caddyfile/Compose/DNS/后端/`/srv/current`。

## Baseline

- livesync-caddy：`de234bae…` Up，healthy，Restarts=0；memos/mortis/couchdb Up 4d
- `/srv/current` → `releases/20260917-1503-abc40bf`，容器内 index/404/blog/projects/tags/rss/robots/sitemap/`_astro/` 全部可读 ✓

## Candidate：`Caddyfile.phase12.candidate`（host 侧，未入 repo）

与生产 Caddyfile 的完整 diff **仅两处**：

```diff
-imshane.site, www.imshane.site {
-	reverse_proxy /api/v1/* mortis:5231
-	reverse_proxy /o/r/* mortis:5231
-	reverse_proxy memos:5230
-	header -Server
-}
+www.imshane.site {
+	redir https://imshane.site{uri} permanent
+	header -Server
+}
+
+imshane.site {
+	root * /srv/current
+	encode zstd gzip
+	file_server
+	handle_errors {
+		rewrite * /404.html
+		file_server
+	}
+	header -Server
+}
```

- **memos block：0 变化**；其余 5 vhost（sync/vault/newapi/linkding/radicale）：0 变化
- apex 不再反代 `/api/v1/*`、`/o/r/*`（Memos 唯一入口 = memos.imshane.site，职责清晰）

## `caddy adapt` 语义确认（生产同款 v2.11.4）

| Host | 解析结果 |
|---|---|
| memos.imshane.site | `proxy→mortis:5231` ×2 + `proxy→memos:5230` —— 与 Phase 11 完全一致 |
| www.imshane.site | `redir status=301 Location=https://imshane.site{http.request.uri}` —— **HTTP 301**，path+query 保留 |
| imshane.site | `vars root=/srv/current` + `file_server` + errors 路由（rewrite→/404.html）|

## `caddy validate`：**Valid configuration**（docker cp → /tmp → validate → 已删除临时文件）

## 404 设计

`handle_errors { rewrite * /404.html; file_server }`：任意错误重写到站内 404 页，**HTTP status 保留**（404 路径返回真 404 + Astro 404 页，非 200）。无 SPA fallback（本站全预渲染，不存在 `try_files /index.html`）。

## 安全边界

- `root * /srv/current` —— **不是** `/srv`：公网仅可见 current 指向的 release，`releases/` 兄弟目录、`docs/`、`scripts/`、`.env`、manifest 均不可达
- file_server 之外无任何 middleware

## Release Preflight（复验）

- 40 blog / 14 tags / 7 projects / RSS 40 items / sitemap / robots / 404.html 齐备
- canonical `https://imshane.site/`；无 localhost / 生产 IP / `/home/ubuntu` 泄露（Hugo 教程正文除外）
- 资产引用：`/_astro/*`（JS/CSS/woff2）全部存在；页面内链为目录形式 `/blog/`、`/projects/x/` → file_server 目录 index 正常解析（无尾斜杠时 Caddy 自动 308 补斜杠）

## Phase 12B Test Matrix（reload 后立即执行）

**apex（新静态站）**：
`/` 200 · `/blog/` 200 · 3 篇 blog 200 · `/tags/` `/tags/go/` 200 · `/projects/` `/projects/cuflash/` 200 · `/about/` 200 · `/rss.xml` `/robots.txt` `/sitemap-index.xml` 200 · `/definitely-does-not-exist` → **404 + Astro 404 页**

**www**：`http(s)://www.imshane.site/abc?x=1` → **301 → `https://imshane.site/abc?x=1`**（path+query 保留，无 loop）

**memos**：`/` 200 · `/auth` 200 · `/api/v1/instance/profile` 200 JSON · `/o/r/` 路由可达 —— 与 Phase 11 完全一致

**其他 5 vhost**：回归与 10A/11 baseline 逐行比对

## Rollback Config

`Caddyfile.bak.20260917-1525`（Phase 11 生效版）：`cp` 还原 → `caddy validate` → `caddy reload` → 8-host 回归。恢复后 apex/www 回到 Memos，Memos 数据零触碰。

## 门禁状态

| Gate | 状态 |
|---|---|
| `MANUAL_MEMOS_CHECK` | **WAITING_FOR_USER_CONFIRMATION** —— 需用户确认 memos.imshane.site 登录/私有 memo/附件/客户端迁移全部正常 |
| `ADMINISTRATIVE_CHECKPOINT` | **WAITING_FOR_USER_ACK** —— Phase 12B 是首次改变 apex 公网内容，备案信息变更与公安联网备案由用户按其流程处理，Agent 不代办 |

## Blockers

P0 = 0，P1 = 0。技术就绪；12B 需两个 USER gate 全部确认后方可执行。
