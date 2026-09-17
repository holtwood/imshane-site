import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "CodeNewRoman",
          "Resource Han Rounded CN",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Noto Sans CJK SC",
          "Noto Sans SC",
          ...defaultTheme.fontFamily.sans,
        ],
        serif: [
          "CodeNewRoman",
          "Resource Han Rounded CN",
          "Songti SC",
          "Noto Serif CJK SC",
          "Noto Serif SC",
          "SimSun",
          ...defaultTheme.fontFamily.serif,
        ],
        mono: [
          "CodeNewRoman",
          "Resource Han Rounded CN",
          ...defaultTheme.fontFamily.mono,
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
