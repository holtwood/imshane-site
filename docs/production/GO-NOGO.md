# Go / No-Go Checklist — Phase 10 准入

截至 Phase 9 审计完成（2026-09-17）的状态标注。

| 项 | 状态 | 依据 |
|---|---|---|
| Phase 8 RC clean | ✅ | commit `4af5cac`：67 pages，check 0/0/0，P0/P1=0 |
| Memos backup strategy verified | ✅ | 本机每日 02:30 SQLite 在线备份（最新 20260917，保留 7d）+ 04:30 rclone→COS 异地；切换不改数据 |
| Caddy config location verified | ✅ | `/home/ubuntu/dev/livesync/Caddyfile` → 容器 `/etc/caddy/Caddyfile:ro`，compose 项目 livesync |
| Memos upstream verified | ✅ | `memos:5230`（web）+ `mortis:5231`（`/api/v1/*`、`/o/r/*`），同 network `livesync_default` |
| static mount strategy decided | ✅ | `./site:/srv:ro` bind mount（父目录挂载 + `current` 软链原子切换）；需一次 caddy recreate |
| TLS state verified | ✅ | 三 host LE 证书有效至 2026-11-19 / 12-08，Caddy 自动管理，无新签发需求 |
| DNS state verified | ✅ | 三 host A→`<PRODUCTION_HOST>`，无 AAAA/CDN；无需任何 DNS 变更 |
| rollback steps documented | ✅ | `ROLLBACK-PLAN.md`：全部回滚 = 还原 Caddyfile + reload，不碰数据 |
| no secret leakage | ✅ | docs 未含密码/token/IP（`<PRODUCTION_HOST>` 抽象）；.env 仅 COUCHDB_* 且未入文档 |
| Memos backend exposure | ✅ 无 | 5230/5984/5231 均未发布到 host，仅容器网络内 |
| 预期中断 | 已评估 | Phase 10 一次 caddy recreate ≈5–10s 全 vhost；Phase 11/12 为热 reload 无中断 |
| user approval received | ☐ | **等待用户确认后进入 Phase 10** |

## 判定

**Go（有条件）**：技术与回滚链路完整、可逆、风险低。
进入 Phase 10 前须用户确认：① 维护窗口可接受 recreate 中断；② 备案行政检查点已知悉。
