// Phase 4 迁移工具使用的规范化规则（已与站点所有者确认，勿擅自修改）
// 契约详见 docs/content-migration.md

// categories：最小必要规范化
export const CATEGORY_MAP = {
  programing: "programming", // 拼写修正
  undefine: null,            // 删除该 category
};

// 其余原样保留：problems / interests / life / work / learn / interviews

export function normalizeCategory(cat) {
  const key = cat.trim();
  if (key in CATEGORY_MAP) return CATEGORY_MAP[key];
  return key;
}

// tags：lowercase + trim + 去空，不做语义重命名（cpp 保持 cpp）
export function normalizeTag(tag) {
  return tag.trim().toLowerCase();
}

// slug：以 Hugo front matter slug 为准，统一小写；
// 已知冲突/特例如下（key = 原文件名）
export const SLUG_OVERRIDES = {
  // 2022-04-29-my-resume 与 2022-05-10-waiting-marlin 的 slug 均为 my-resume；
  // 旧站靠日期路径区分，新站 /blog/{slug}/ 扁平化后冲突 → 后者改为 waiting-marlin
  "2022-05-10-waiting-marlin.md": "waiting-marlin",
};

export function normalizeSlug(slug) {
  return slug.trim().toLowerCase();
}

// 旧 URL 规则：/post/:year/:month/:day/:slug/
export function legacyPostUrl(date, slug) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `/post/${y}/${m}/${d}/${slug}/`;
}
