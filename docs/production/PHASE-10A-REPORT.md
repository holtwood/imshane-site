# Phase 10A — Prepare Production Release（执行报告）

执行时间：2026-09-17。范围：**仅准备**，未修改 docker-compose.yml / Caddyfile，未 recreate/reload 任何容器，未切换流量。

## 1. Baseline 确认

- `git status`：clean ✓
- `4af5cac..abc40bf` diff：仅 `docs/` 新增 + `scripts/qa.mjs` 一行（QA 脚本自身的 unused-param 修复）。**站点代码（src/ public/ astro.config package.json pnpm-lock tailwind tsconfig）0 变化** ✓
- Site RC code baseline = `4af5cac`；本次构建 HEAD = `abc40bf`

## 2. Fresh Build

- `pnpm install --frozen-lockfile`：被 pnpm 供应链策略拦截（esbuild/sharp build scripts 未 approve）。现有 node_modules 与 lockfile 一致（同 HEAD Phase 8 构建已成功），按预案跳过重装。
- `pnpm run build`：**67 pages**；`astro check`：**0/0/0**
- dist 完整性：index.html / 404.html / rss.xml / robots.txt / sitemap-index.xml / sitemap-0.xml 齐备；blog=40 目录、tags=14、projects=7
- dist：121 文件，2.5 MB

## 3–5. Release Layout

```text
/home/ubuntu/dev/livesync/site/
├── releases/20260917-1503-abc40bf/   ← dist 全量（121 files / 2.5MB / 67 dirs）
└── current -> releases/20260917-1503-abc40bf   （相对软链）
```

- `readlink -f current/index.html` 解析正常 → 未来容器内 `/srv/current/...` 可解析（同一 parent bind mount 内）
- 拷贝方式：`rsync -a dist/ releases/<rel>/`，release 目录新建为空，无历史覆盖
- **不含**：src/ docs/ scripts/ .git/ .env/ migration 报告/old-url-map.csv/node_modules（find 校验 0 命中）

## 6. Release Integrity

- HTML 敏感串扫描：`localhost/127.0.0.1` 仅出现于 `blog/how-to-use-hugo/`（Hugo 教程合法正文，Phase 8 已确认）；无 `<PRODUCTION_HOST>`、无 `/home/ubuntu`
- canonical = `https://imshane.site/` ✓
- hash manifest（121 条 sha256）：`/home/ubuntu/dev/livesync/release-manifest-20260917-1503-abc40bf.txt`
  —— 刻意放在 `site/` **之外**：site/ 整体将挂为 /srv，其下任何文件都会被公开服务，manifest 不能放里面

## 7. Fresh Memos Backup（pre-change checkpoint）

- `backup.sh` 手动执行：exit 0，日志「全部成功」
- 产物：`backups/memos/memos_prod-20260917.db`（128KB，15:05 刷新）+ 8 个 couchdb `bak-*-20260917` 快照库（脚本同日幂等重跑，覆盖当日上午快照）
- 今日 04:30 COS 异地备份已成功（含上午版本）；本次 15:05 快照为最新本机 checkpoint

## 8. Production Config Backup

| 文件 | 备份 | 权限 |
|---|---|---|
| Caddyfile | `Caddyfile.bak.20260917-1506` | 644 |
| docker-compose.yml | `docker-compose.yml.bak.20260917-1506` | 644 |
| .env | `.env.bak.20260917-1506` | **600**，仅本目录，未入 repo/未打印值 |

## 9. Pre-change Caddy Baseline

- container id `2305ebef79ab`，Started 2026-09-13，Restarts 0，Health healthy
- 8 个公开 host 指纹（Phase 10B 后逐项比对）：

| Host | http | https | title/备注 |
|---|---|---|---|
| imshane.site | 308 | 200 | Memos |
| www.imshane.site | 308 | 200 | Memos |
| memos.imshane.site | 308 | 200 | Memos |
| sync.imshane.site | 308 | 403 | 非 /vgnp83 路径拒绝（正常）|
| vault.imshane.site | 308 | 200 | Vaultwarden |
| newapi.imshane.site | 308 | 200 | New API |
| linkding.imshane.site | 308 | 302 | → 登录页 |
| radicale.imshane.site | 308 | 302 | → 登录页 |

**10B 后期望：全部 8 行完全一致**（mount 不应对任何 vhost 产生行为变化）。

## 10. Core Domain Baseline

`imshane.site` / `www` / `memos`：http 308→https，https 200，title=Memos。10B 不得改变。

## 11. Proposed Compose Diff（仅展示，未应用）

```diff
 services:
   caddy:
     volumes:
       - ./Caddyfile:/etc/caddy/Caddyfile:ro
       - ./data/caddy:/data
       - ./data/caddy-config:/config
+      - ./site:/srv:ro
```

基于真实 `docker-compose.yml`（volumes 列表第 13–15 行后追加一行）。

## 12. Mount Design 验证

- `./site:/srv:ro` 父目录挂载；容器内 `/srv/current` 是相对软链 `releases/<rel>`，在**同一 mount 内解析** → 无需 remount 即可原子换版本 ✓
- 备选方案（挂 `site/current` 本身）已排除：bind mount 按 inode 固化，软链重指向对容器不可见
- 无副作用：site/ 目前未被任何服务引用，创建它不影响线上

## 13. Permissions Preflight

- site/ 全部文件 `644`、目录 `775`、owner `ubuntu:ubuntu`；`current` 软链 777（正常）
- Caddy 容器 user=root（默认），可读一切；即便以非 root 运行，world-readable 也满足 → **无需任何 chmod** ✓

## 14. Phase 10B Execution Plan（未执行）

```bash
cd /home/ubuntu/dev/livesync
docker compose config -q                    # 1. 校验 compose 语法
docker compose up -d --no-deps caddy        # 2. 仅 recreate caddy，不触碰 memos/mortis/couchdb
docker ps livesync-caddy                    # 3. healthy
docker exec livesync-caddy ls /srv/current/index.html   # 4. mount 内可见
# 5. 8-vhost 指纹逐项比对（见 §9）
```

预期中断：**约 5–10s**，影响 Caddy 全部 8 个 host；Memos/CouchDB backend 不停止。

## 15. Phase 10B Rollback

```bash
cp docker-compose.yml.bak.20260917-1506 docker-compose.yml
docker compose config -q
docker compose up -d --no-deps caddy
# 验证 §9 八行指纹恢复
```

Caddyfile 10B 未改，无需恢复（备份仍保留）。

## 16. Administrative Checkpoint

ACKNOWLEDGED —— 10A/10B 不改变公网内容（主域仍 Memos）。备案信息变更为 Phase 12 的人工检查点，Agent 不执行行政操作。

## Blockers

P0 = 0，P1 = 0。就绪等待 Phase 10B 指令。
