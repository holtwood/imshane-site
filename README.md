# imshane-site

https://imshane.site 的源码 —— Shane 的个人网站（主页 + 技术博客 + 项目展示）。

基于 [Astro Nano](https://github.com/markhorn-dev/astro-nano)（MIT）构建的静态站点，技术栈：Astro + Tailwind CSS + MDX。

要求 Node.js >= 20.11，仓库通过 `packageManager` 固定 pnpm 12.16.1。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev        # 本地开发
pnpm build      # astro check && astro build → dist/
pnpm lint
pnpm qa         # 静态产物 QA（含重定向产物与 RSS/SEO 检查）
pnpm exec playwright install chromium
pnpm smoke      # Playwright smoke
pnpm shots      # Playwright 截图，默认输出 /tmp/qa-shots（OUT=... 可覆盖）
```

迁移校验需要把 `holtwood/hugo-blog` 检出到本仓库同级的 `../hugo-blog`，然后运行 `pnpm verify:migration`。

历史博文迁移自 [holtwood/hugo-blog](https://github.com/holtwood/hugo-blog)（Hugo + hugo-xmin，已归档）。

## 内容结构

- `src/content/blog/` — 博客文章（40 篇，`{slug}/index.md` + 本地化图片）
- `src/content/projects/` — 项目（`{slug}/index.md`，`featured`/`order` 控制首页与排序）
- `src/pages/` — 页面路由（`/blog/`、`/tags/`、`/projects/`、`/about/`）
- `scripts/` — Hugo 迁移工具（`migrate.mjs` / `verify-migration.mjs`）与 QA 脚本（`qa.mjs` / `smoke.mjs`）

## 部署

纯静态输出：`pnpm build` 生成 `dist/`，任意静态托管/Nginx/Caddy 直接服务即可，无服务端运行时、无数据库；字体自托管，分析使用自托管的 GoatCounter（`stats.imshane.site`）。构建前的 `prebuild` 会自动根据 `old-url-map.csv` 重新生成重定向产物。

旧博客的 `/post/YYYY/MM/DD/.../` URL 由两层机制承接：

- `pnpm redirects` 生成 `deploy/legacy-redirects.caddy`（推荐，真实 301）和 `public/_redirects`（Netlify/Cloudflare Pages 风格）。
- `astro.config.mjs` 同时生成静态 meta-refresh 兜底页，保证没有服务器重定向时旧链接也不会 404。

Caddy 中把 `deploy/legacy-redirects.caddy` include 到 `imshane.site` 的 site block 内；修改 `old-url-map.csv` 后重新运行 `pnpm redirects`（`pnpm build` 也会自动执行）。建议在反向代理层开启 `encode zstd gzip`，并给 `/_astro/*`、`/fonts/cnr/*`、`/fonts/rhr/*` 设置长缓存。
