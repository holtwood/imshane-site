import fs from "node:fs";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

function loadLegacyRedirects() {
  const csv = fs.readFileSync(new URL("./old-url-map.csv", import.meta.url), "utf8");
  const rows = csv.trim().split(/\r?\n/).slice(1);
  return Object.fromEntries(
    rows.map((line) => {
      const match = line.match(/^([^,]+),([^,]+),/);
      if (!match) throw new Error(`bad old-url-map.csv row: ${line}`);
      const [, from, to] = match;
      return [from, { destination: to, status: 301 }];
    }),
  );
}

export default defineConfig({
  site: "https://imshane.site",
  trailingSlash: "always",
  redirects: loadLegacyRedirects(),
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith("/post/"),
    }),
    tailwind(),
  ],
});
