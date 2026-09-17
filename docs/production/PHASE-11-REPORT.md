# Phase 11 — Stabilize Memos Subdomain（执行报告）

执行时间：2026-09-17 15:46（UTC+8）。结果：**PASS**。全程仅 Caddyfile 变更 + `caddy reload` 热加载。

## Exact Semantic Diff

```diff
-memos.imshane.site, imshane.site, www.imshane.site {
+memos.imshane.site {
+	reverse_proxy /api/v1/* mortis:5231
+	reverse_proxy /o/r/* mortis:5231
+	reverse_proxy memos:5230
+	header -Server
+}
+
+imshane.site, www.imshane.site {
 	reverse_proxy /api/v1/* mortis:5231
 	reverse_proxy /o/r/* mortis:5231
 	reverse_proxy memos:5230
 	header -Server
 }
```

三联 block → `memos.imshane.site` 独立 + `imshane.site, www.imshane.site` 共享。三条路由原样复制，**路由语义零变化**。

## 执行链路

1. 备份：`Caddyfile.bak.20260917-1525`（577B，与生效版一致）
2. `docker exec livesync-caddy caddy validate --config /etc/caddy/Caddyfile` → **Valid configuration**
3. `docker exec livesync-caddy caddy reload --config /etc/caddy/Caddyfile` → adapted + loaded，exit 0

## 身份与回归

| 检查 | 结果 |
|---|---|
| Caddy container ID | `de234bae845b…` **不变**（未 recreate）|
| Caddy Restarts | 0（未增加）|
| memos/mortis/couchdb ID | `48991a56`/`9005391d`/`ad156a76` **全不变** |
| Caddy Health | healthy |

### 8-Host 回归（reload 前后逐项一致）

| Host | 结果 |
|---|---|
| imshane.site | 308/200 title=Memos PASS（**仍是 Memos，未切 Astro**）|
| www.imshane.site | 308/200 Memos PASS（**未加 301**）|
| memos.imshane.site | 308/200 Memos PASS |
| sync | 308/403 PASS |
| vault / newapi | 308/200 PASS |
| linkding / radicale | 308/302 PASS |

**8/8 PASS。**

## memos.imshane.site 深度验证

| 项 | 结果 |
|---|---|
| Web 页面 | 200，title `Memos` |
| CSS/JS/静态资产 | `/assets/index-*.js`、`/logo.webp`、`/apple-touch-icon.png`、`/site.webmanifest` 全部 200 + 正确 MIME |
| 登录入口 | `/auth` 200 |
| `/api/v1/*` → mortis:5231 | `/api/v1/instance/profile` **200 JSON**；`/api/v1/memos` 401（需认证，路由正确）；不存在端点 404 JSON（非 502）|
| `/o/r/*` → mortis:5231 | 探测路径 404（到达后端，非 502/503）|
| apex 硬编码 | 页面 HTML 与主 JS bundle 中 **无** `imshane.site`/`www.imshane.site` 绝对 URL |
| CORS | `vary: Origin` 正常，无异常 ACAO |
| 5xx | 无 502/503 |

TLS：`memos.imshane.site` 证书原样（LE，至 2026-11-19）。

## Caddy 日志（reload 后）

error=0；仅 2 条 reload 固有 warn（`:80` 上 HTTP/2-3 requires TLS）。无 upstream/TLS/权限异常。

## Rollback

未触发。预案保持：`cp Caddyfile.bak.20260917-1525 Caddyfile` → validate → reload。

## 遗留

- **需用户人工验证**：Memos 实际登录、私有 memo 内容、客户端（App/快捷指令等）切到 `memos.imshane.site` 后的完整功能——未使用任何凭据测试。
- 其他 vhost（vault/linkding/radicale/newapi）为 302/登录页级验证，深度功能同理未测。

## Blockers

P0=0，P1=0，P2=0，P3=0。
