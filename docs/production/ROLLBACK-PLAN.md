# Rollback Plan

适用对象：`/home/ubuntu/dev/livesync/` compose stack（Caddyfile + docker-compose.yml）。
原则：所有回滚 = **还原配置文件 + `caddy reload`**。不碰 Memos 容器/数据/volume，不动 DNS，不重启其他服务。

## 基线快照（Phase 10 开始前建立）

```bash
cd /home/ubuntu/dev/livesync
cp Caddyfile Caddyfile.bak.<ts>
cp docker-compose.yml docker-compose.yml.bak.<ts>
docker ps --format '{{.Names}} {{.Status}}' > /tmp/pre-change-containers.<ts>.txt
```

## Phase 10 回滚（新增 mount 后异常）

触发条件：caddy recreate 失败、容器不健康、其他 vhost 异常。

```bash
cd /home/ubuntu/dev/livesync
cp docker-compose.yml.bak.<ts> docker-compose.yml
docker compose up -d caddy        # 回到无 site mount 的原容器定义
docker ps livesync-caddy          # 期望 healthy
```

验证：`curl -I https://imshane.site` / `memos.imshane.site` 均 200（仍指向 Memos）。
注意：`site/` 目录残留无害，不删除也行。

## Phase 11 回滚（memos.imshane.site 拆分后异常）

触发条件：`memos.imshane.site` 502 / 登录失败 / `/api/v1/*` 或 `/o/r/*` 异常。

```bash
cd /home/ubuntu/dev/livesync
cp Caddyfile.bak.<ts> Caddyfile   # 还原三联 block
docker exec livesync-caddy caddy reload --config /etc/caddy/Caddyfile
```

验证：
- `curl -s https://memos.imshane.site/ | grep -o '<title>[^<]*'` = Memos
- `curl -sI https://memos.imshane.site/api/v1/instance/profile` 非 5xx
- 附件 `/o/r/` 抽查 200

## Phase 12 回滚（主站切换后异常）

触发条件：`imshane.site` 非 200 / 页面空白 / 静态资源大面积 404 / 错误地把请求打给了 Memos 之外的错误目标。

```bash
cd /home/ubuntu/dev/livesync
cp Caddyfile.bak.<ts> Caddyfile   # 还原到 Phase 11 拆分后版本（主站仍反代 Memos）
docker exec livesync-caddy caddy reload --config /etc/caddy/Caddyfile
```

验证：
- `https://imshane.site/` 恢复 title `Memos`，200
- `https://www.imshane.site/` 200（不再 301）
- `https://memos.imshane.site/` 不受影响

若问题仅是静态文件缺失/错位而非路由问题：也可将 `site/current` 软链指回上一个可用 release（**不要**改 Caddyfile）。

## 回滚后的状态确认清单

- [ ] `docker ps`：全部容器 Up，livesync-caddy healthy
- [ ] 三域名 https 均 200，title 符合当前阶段期望
- [ ] `curl -I http://imshane.site` → 308 https
- [ ] Caddy 日志无连续 reload/config 报错：
  `docker logs livesync-caddy --tail 50 | grep -i error`
- [ ] Memos 数据目录未被动过：`data/memos/` mtime 无异常

## 永不执行项

- 不 `docker rm` / `docker stop` memos、couchdb、mortis
- 不动 `data/` 下任何目录
- 不改 `.env`、不改 DNS、不改 UFW
- 不为回滚恢复数据库（切换过程数据库从未变更）
