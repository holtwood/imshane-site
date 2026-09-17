# Current Production Topology（Phase 9 只读审计结果）

审计时间：2026-09-17。审计方式：纯只读（inspect/curl/dig/openssl/读配置文件），未做任何变更。

## Host

| 项 | 值 |
|---|---|
| 机器 | tencent-01（KVM 云主机，hostname `ubuntu`，公网 `<PRODUCTION_HOST>`）|
| OS/Kernel | Ubuntu, kernel 7.0.0-30-generic |
| CPU / RAM | 2 vCPU / 1.9 GiB（used 713Mi, available ~1.2Gi）|
| Disk | 49G，used 38%，inode 11% —— 静态站（dist ~几 MB）空间充足 |
| Uptime / Load | 25 天 / 0.19–0.34 |
| 防火墙 | UFW active：仅 2243(SSH) / 80 / 443 公开；8895 限 docker 网段 |
| SELinux | 无；AppArmor module loaded（默认 docker 策略）|

## Compose Project：`/home/ubuntu/dev/livesync/`

`docker-compose.yml` 单文件管理全部入口服务。`.env` 仅含 `COUCHDB_USER` / `COUCHDB_PASSWORD`（值不入文档）。

| Service | Container | Image（摘要） | Status | Ports | Mounts |
|---|---|---|---|---|---|
| caddy | livesync-caddy | caddy v2.11.4（sha256:df7f1c…）| up 4d, healthy | **0.0.0.0:80, 0.0.0.0:443**；2019 admin 仅容器内 | `Caddyfile→/etc/caddy/Caddyfile:ro`、`data/caddy→/data`、`data/caddy-config→/config` |
| memos | livesync-memos | neosmemo/memos（sha256:71a5b4…，对应 0.30.x）| up 4d，无 healthcheck | 仅容器内 5230，**未公开** | `data/memos→/var/opt/memos`（rw）|
| couchdb | livesync-couchdb | couchdb（sha256:b80216…）| up 4d | 仅容器内 5984 等 | `data/couchdb→/opt/couchdb/data` 等 |
| mortis | livesync-mortis | mudkipme/mortis:0.30.0 | up 4d | 仅容器内 5231 | 无 |

同机其他 stack（独立 compose，与本项目无耦合）：vaultwarden、linkding、radicale、new-api、beszel-agent。均只暴露 localhost 端口或不暴露。

## Caddyfile 现状（`/home/ubuntu/dev/livesync/Caddyfile`，36 行）

```text
sync.imshane.site        → /vgnp83/* reverse_proxy couchdb:5984；其余 403
memos.imshane.site,
imshane.site,
www.imshane.site         → 同一个 block：
                           /api/v1/* → mortis:5231
                           /o/r/*    → mortis:5231
                           其余      → memos:5230
vault.imshane.site       → vaultwarden:80
newapi.imshane.site      → new-api:3000
linkding.imshane.site    → linkding:9090
radicale.imshane.site    → radicale:5232
```

**关键事实：当前 `imshane.site` / `www.imshane.site` / `memos.imshane.site` 三个 host 共享同一个 Memos block，www 无 301。**

## 真实链路（当前）

```text
Internet
   │  DNS: imshane.site / www / memos → A <PRODUCTION_HOST>（无 AAAA，无 CDN）
   ▼
Host :443 (UFW allow)
   ▼
livesync-caddy :443   （network: livesync_default；TLS 由 Caddy 自动管理，LE 证书）
   │  SNI 分流
   ├─ imshane.site ──────────┐
   ├─ www.imshane.site ──────┤→ 同一个 block
   └─ memos.imshane.site ────┘
        │  /api/v1/*, /o/r/* → livesync-mortis:5231 → memos gRPC :5230
        └─ 其余路径           → livesync-memos:5230
                                   ▼
                          data/memos/memos_prod.db（SQLite, WAL 模式）
```

## 域名指纹（当前）

| Host | http | https | title |
|---|---|---|---|
| imshane.site | 308→https | 200 | `Memos` |
| www.imshane.site | 308→https | 200 | `Memos` |
| memos.imshane.site | 308→https | 200 | `Memos` |

## TLS（Caddy 自动 HTTPS，Let's Encrypt YE2）

| Host | SAN | 有效期 |
|---|---|---|
| imshane.site | imshane.site | 2026-09-09 → 2026-12-08 ✓ |
| www.imshane.site | www.imshane.site | 2026-09-09 → 2026-12-08 ✓ |
| memos.imshane.site | memos.imshane.site | 2026-08-21 → 2026-11-19 ✓ |

## Memos 数据与备份

- 数据目录：`/home/ubuntu/dev/livesync/data/memos/`（66MB，`memos_prod.db` + WAL + assets + thumbnail_cache）
- 本机备份：cron 每日 02:30 `backup.sh` → SQLite 在线备份到 `backups/memos/memos_prod-YYYYMMDD.db`，保留 7 天。最新：`memos_prod-20260917.db`，日志显示全部成功。
- 异地备份：cron 每日 04:30 `offsite-backup.sh tencent-01` → rclone copy `livesync/backups/`（含 memos db）至 COS `imshane-backup/tencent-01/livesync/`。
- **结论：现有备份足以支撑 Phase 11/12 回滚**（切换只改路由，不动数据）。

## 端口暴露结论

- 公网监听：80、443（caddy）、2243（SSH）。**Memos/5230、CouchDB/5984、Mortis/5231 均未直接暴露公网** ✓
- Caddy admin API（2019）仅在容器内，由 healthcheck 使用，未发布到 host ✓
- docker.sock 仅 beszel-agent 挂载（监控 agent，已知用途）

## 静态目录现状

- Caddy 容器**当前没有任何静态目录 mount** → Phase 10 需要给 caddy service 新增一个 host bind mount（Compose 修改）。
- host 上 `/srv` 存在但为空且 root 持有；计划使用 compose 目录内 `./site/`（与 stack 同生命周期，权限随 ubuntu 用户管理）。
