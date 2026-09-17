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
          "Inter",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Noto Sans CJK SC",
          "Noto Sans SC",
          ...defaultTheme.fontFamily.sans,
        ],
        serif: [
          "Lora",
          "Songti SC",
          "Noto Serif CJK SC",
          "Noto Serif SC",
          "SimSun",
          ...defaultTheme.fontFamily.serif,
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
