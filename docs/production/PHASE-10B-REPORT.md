# Phase 10B — Add Static Mount to Caddy（执行报告）

执行时间：2026-09-17 15:17（UTC+8）。结果：**PASS**。

## 变更内容

唯一语义变更（`diff -u` 验证仅一行）：

```diff
     volumes:
       - ./Caddyfile:/etc/caddy/Caddyfile:ro
       - ./data/caddy:/data
       - ./data/caddy-config:/config
+      - ./site:/srv:ro
```

- `docker compose config -q`：exit 0；解析结果 `bind /home/ubuntu/dev/livesync/site → /srv read_only: true`
- 未触碰 Caddyfile / DNS / Memos / Mortis / CouchDB / firewall / networks / env / routing / TLS

## Recreate 记录

| 项 | 值 |
|---|---|
| 命令 | `docker compose up -d --no-deps caddy` |
| 命令耗时 | ~1.4s |
| 首个 https 200 | ~2.0s 后（实测中断 ≈ **2s**，预估 5–10s 内）|
| 旧 container ID | `2305ebef79ab…`（Started 09-13，Restarts 0）|
| 新 container ID | `de234bae845b…`（Started 09-17 15:17，Restarts 0，healthy）|
| image digest | **不变** `sha256:df7f1c2f…` |
| 后端容器 | memos `48991a56` / mortis `9005391d` / couchdb `ad156a76` —— **ID 全部未变，零 recreate** ✓ |

## Mount 验证

- `docker inspect`：`/home/ubuntu/dev/livesync/site → /srv RW=false` ✓ 只读
- 容器内 `readlink /srv/current` → `releases/20260917-1503-abc40bf`（软链在同一 bind mount 内正确解析）✓
- `/srv/current/index.html` `404.html` `blog/` `projects/` `tags/` 全部可读，`index.html` 内容为 Astro 产物 ✓
- 未做任何写入测试（以 mount metadata 判定只读）

## 8-Host 回归

| Host | Before http/https | After http/https | 结果 |
|---|---|---|---|
| imshane.site | 308/200 Memos | 308/200 Memos | PASS |
| www.imshane.site | 308/200 | 308/200 | PASS |
| memos.imshane.site | 308/200 | 308/200 | PASS |
| sync.imshane.site | 308/403 | 308/403 | PASS |
| vault.imshane.site | 308/200 | 308/200 | PASS |
| newapi.imshane.site | 308/200 | 308/200 | PASS |
| linkding.imshane.site | 308/302 | 308/302 | PASS |
| radicale.imshane.site | 308/302 | 308/302 | PASS |

**8/8 PASS。路由行为零变化：`imshane.site` 仍是 Memos，`www` 仍无 301，memos 正常。**

## TLS

抽查 imshane / memos / vault：证书 SAN 与有效期与 recreate 前完全一致（LE，至 11-19 / 12-08），无新签发、无丢失。

## Caddy Logs（recreate 后 5 分钟内）

error=0。仅 2 条预期 warn：`:80` 上 "HTTP/2(3) skipped because it requires TLS"（每次启动固有输出，非异常）。无 permission denied / mount / upstream / TLS error。

## Resources

- caddy 14MB / 128MB limit（recreate 后更低）；memos 45MB；全机 mem avail 1.2Gi
- `docker ps`：10 容器全部 Up，无 crash loop

## Rollback

未触发。回滚预案（compose.bak → config -q → `up -d --no-deps caddy`）保持可用。

## 最终状态

Caddy mounts：Caddyfile + /data + /config + **/srv(ro)**。路由零变化。静态站**尚未对公网服务**——那是 Phase 12。

## Blockers

P0 = 0，P1 = 0。
