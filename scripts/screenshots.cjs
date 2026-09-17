const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const OUT = '/tmp/shots';
const SANS_CSS = `article p, article li { font-family: Inter, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif !important; }`;

(async () => {
  const browser = await chromium.launch();

  async function shot(name, path, { width = 1440, height = 900, dark = false, css = null, full = true } = {}) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      colorScheme: dark ? 'dark' : 'light',
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    if (dark) await page.evaluate(() => document.documentElement.classList.add('dark'));
    if (css) await page.addStyleTag({ content: css });
    await page.waitForTimeout(900); // let .animate transitions finish
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
    await ctx.close();
    console.log('shot', name);
  }

  await shot('home-desktop-light', '/');
  await shot('home-desktop-dark', '/', { dark: true });
  await shot('home-mobile-light', '/', { width: 390, height: 844 });
  await shot('home-laptop-light', '/', { width: 1280, height: 800 });
  await shot('about-desktop-light', '/about/');
  await shot('blog-list-light', '/blog/');
  await shot('post-serif-desktop', '/blog/welcome/');
  await shot('post-sans-desktop', '/blog/welcome/', { css: SANS_CSS });
  await shot('post-serif-mobile', '/blog/welcome/', { width: 390, height: 844 });
  await shot('post-sans-mobile', '/blog/welcome/', { width: 390, height: 844, css: SANS_CSS });
  await shot('post-dark-serif', '/blog/welcome/', { dark: true });
  await shot('projects-light', '/projects/');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
