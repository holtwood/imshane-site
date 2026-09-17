# imshane-site

https://imshane.site 的源码 —— Shane 的个人网站（主页 + 技术博客 + 项目展示）。

基于 [Astro Nano](https://github.com/markhorn-dev/astro-nano)（MIT）构建的静态站点，技术栈：Astro + Tailwind CSS + MDX。

```bash
pnpm install    # 或 npm install
pnpm dev        # 本地开发
pnpm build      # astro check && astro build → dist/
```

历史博文迁移自 [holtwood/hugo-blog](https://github.com/holtwood/hugo-blog)（Hugo + hugo-xmin，已归档）。

## 内容结构

- `src/content/blog/` — 博客文章（40 篇，`{slug}/index.md` + 本地化图片）
- `src/content/projects/` — 项目（`{slug}/index.md`，`featured`/`order` 控制首页与排序）
- `src/pages/` — 页面路由（`/blog/`、`/tags/`、`/projects/`、`/about/`）
- `scripts/` — Hugo 迁移工具（`migrate.mjs` / `verify-migration.mjs`）与 QA 脚本（`qa.mjs` / `smoke.mjs`）

## 部署

纯静态输出：`pnpm build` 生成 `dist/`，任意静态托管/Nginx/Caddy 直接服务即可，无服务端运行时、无数据库、无外部字体与追踪脚本。
