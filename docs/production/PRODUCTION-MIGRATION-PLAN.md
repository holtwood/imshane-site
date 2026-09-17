# Production Migration Plan

基于 Phase 9 实际审计（见 `current-topology.md`），不含任何假设路径。
发布来源：`~/github/holtwood/imshane-site`，Release Candidate commit `4af5cac`。

## Current State

- `imshane.site` / `www.imshane.site` / `memos.imshane.site` **三 host 共用同一 Caddy block**，全部 `reverse_proxy memos:5230`（`/api/v1/*`、`/o/r/*` 走 `mortis:5231`）。页面 title 均为 `Memos`。
- Caddy（livesync-caddy）无任何静态文件 mount。
- Memos 数据与备份机制完整（本机每日 + COS 异地）。

## Target State

```text
imshane.site       → Caddy file_server → /srv/current（Astro dist）
www.imshane.site   → 301 https://imshane.site{uri}
memos.imshane.site → 不变：mortis(API) + memos(5230) 反代
```

Memos 容器、数据、volume、网络**全部不动**；变化仅限 Caddyfile 路由与一个只读 bind mount。

## Differences

1. Caddyfile：`imshane.site`/`www.imshane.site`/`memos.imshane.site` 三联 block 必须拆分
2. Compose：caddy service 新增一个 `./site:/srv:ro` bind mount
3. host 新增 `./site/` 静态发布目录（releases + current 软链）

## Prerequisites

- [ ] Phase 8 RC：commit `4af5cac`，build 67 pages，check 0/0/0
- [ ] 工作区 clean，部署前重新 `pnpm build` 并记录 release commit
- [ ] 备份完成（见下）
- [ ] 明确维护窗口：Phase 10 的 caddy recreate 有约 5–10s 全站中断

### 执行前备份清单（Phase 10/11 开始时执行，非现在）

- `Caddyfile` → `Caddyfile.bak.<ts>`（目录已有此惯例）
- `docker-compose.yml` → `.bak.<ts>`
- `.env` → 存于本机安全位置（不入 git）
- `data/memos/`（或确认当日 `backups/memos/` 已含最新快照）——仅冗余保险，切换不改数据
- 记录当前容器列表 `docker ps` 快照

## Phase 10 — Prepare Static Site

目标：静态文件就位 + Caddy 可读，**不切任何流量**。

1. 本机（开发机）`git checkout 4af5cac`（或指定 release commit），`pnpm build`
2. host 上创建 `/home/ubuntu/dev/livesync/site/`：
   ```text
   site/
     releases/<date>-<shorthash>/   ← dist 内容
     current -> releases/<date>-<shorthash>
   ```
   通过 `rsync`/`scp` 上传 dist 到 `releases/<ts>/`，再原子切换 `current` 软链。
   - 选「挂载父目录 + current 软链」而非直接挂 `current`：bind mount 按 inode 解析，挂父目录后软链重指向对容器内 Caddy 即时可见，实现原子切换、免 remount。
   - dist 内文件需对 Caddy 容器进程（root）可读：默认 umask 644/755 即可满足；不做 chmod 特殊化。
3. `docker-compose.yml` caddy service 追加：
   ```yaml
   - ./site:/srv:ro
   ```
4. `docker compose up -d caddy`（**唯一一次容器 recreate，预计中断 5–10s，影响全部 vhost，建议低峰执行**）
5. 验证：`docker exec livesync-caddy ls /srv/current/index.html` 可读；所有现有域名仍 200。
6. Caddyfile 加入 `imshane.site` 静态 block 但**暂不生效**？——否。配置必须改完即生效（Caddyfile 是单一配置）。因此静态 block 的启用归入 Phase 12；Phase 10 只完成 mount + 文件就位 + compose 变更，Caddyfile 不动。

## Phase 11 — Stabilize Memos Subdomain

目标：`memos.imshane.site` 作为 Memos 唯一长期入口被完整验证。**数据不迁移。**

1. 拆分 Caddyfile 三联 block 为两段（此时主站仍指 Memos，行为不变）：
   ```text
   memos.imshane.site {
       reverse_proxy /api/v1/* mortis:5231
       reverse_proxy /o/r/* mortis:5231
       reverse_proxy memos:5230
       header -Server
   }
   imshane.site, www.imshane.site {
       reverse_proxy /api/v1/* mortis:5231
       reverse_proxy /o/r/* mortis:5231
       reverse_proxy memos:5230
       header -Server
   }
   ```
2. `docker exec livesync-caddy caddy fmt --check`（可选）后 `caddy reload --config /etc/caddy/Caddyfile`（Phase 11 执行时允许；热加载不中断连接）
3. 全量验证 memos.imshane.site：页面 200、登录页可达、`/api/v1/*` 响应、附件 `/o/r/*` 可访问、HTTPS 正常。
4. 向用户确认 Memos 客户端/书签全部迁移至 `memos.imshane.site`。

## Phase 12 — Cut Over Main Site

1. 再次确认 `memos.imshane.site` 完整可用（Phase 11 门）
2. Caddyfile 改为：
   ```text
   memos.imshane.site {
       reverse_proxy /api/v1/* mortis:5231
       reverse_proxy /o/r/* mortis:5231
       reverse_proxy memos:5230
       header -Server
   }
   www.imshane.site {
       redir https://imshane.site{uri} permanent
       header -Server
   }
   imshane.site {
       root * /srv/current
       encode zstd gzip
       file_server
       header -Server
       handle_errors {
           rewrite * /{err.status_code}.html
           file_server
       }
   }
   ```
   注意：`handle_errors` 使未知路径返回 404.html 且保留状态码；静态站全部路由为预生成文件，无 fallback SPA 需求。
3. `caddy reload`（热加载，无中断）
4. 切换后验证（见下）。

## Verification

| 检查 | 期望 |
|---|---|
| `https://imshane.site/` | 200，title `简说技术`，非 Memos |
| `https://imshane.site/blog/` … 67 routes | 200，抽查含 TOC 长文、tags、projects |
| `/rss.xml` / `/sitemap-index.xml` / `/robots.txt` | 200，内容正确 |
| `https://www.imshane.site/x` | 301 → `https://imshane.site/x` |
| `http://*` 三个 host | 308 → https |
| `https://memos.imshane.site/` | 200，title `Memos`，登录可用，附件正常 |
| TLS | 三证书有效（复用现有证书，无新签发）|
| 不存在路径 | 404 + 站点 404 页 |
| dist 内无 `.env`/`.git`/`docs/`/`scripts/` | 确认 file_server root=/srv/current 只含 dist 产物 |

## Administrative Checkpoint

- 域名已有备案；主站内容由 Memos 变更为「简说技术」个人技术网站后，按用户确认的备案流程处理网站信息变更与后续公安联网备案。**本 Agent 不提交、不修改任何备案。** 公网长期切换前由用户完成确认。

## Risks

| # | 场景 | Detection | Impact | Rollback |
|---|---|---|---|---|
| A | Caddyfile 语法错误 | `caddy reload` 报错/容器日志 | 全站配置不生效（旧配置仍在跑）| 还原 Caddyfile.bak + reload |
| B | memos.imshane.site 502 | curl 502 / 用户反馈 | Memos 不可达 | 还原 block 至三联原状 + reload |
| C | TLS 签发失败 | openssl/caddy log | 新 host 无证书 | 三域名证书均已存在，无新签发需求；若触发，回滚 |
| D | /srv 权限拒绝 | file_server 403 | 主站 403 | 修文件权限或回滚 Caddyfile |
| E | 静态资源 404 | 抽查 css/js/图片 | 页面样式缺失 | 检查 releases/current 完整性；回滚 |
| F | DNS 不一致 | dig | ——（三 host 已同 IP，无需改 DNS）| n/a |
| G | 浏览器缓存旧 301/资源 | 用户侧 | 旧页面 | 告知清缓存；切换本身是 host 级，无旧 301 残留（此前 www 未 301）|
| H | 容器意外重启 | docker ps | —— | unless-stopped 自恢复；compose 文件已备份 |
| I | Memos 附件损坏 | /o/r/* 抽查 | 图片/附件 404 | mortis 路由块保留即可；回滚见 B |
| J | 主站可访问但 RSS/sitemap 404 | curl | SEO 影响 | 确认 dist 含 xml；回滚 |

## Rollback Reference

详见 `ROLLBACK-PLAN.md`。核心原则：**所有回滚只涉及 Caddyfile 还原 + `caddy reload`，绝不触碰 Memos 数据与容器。**
