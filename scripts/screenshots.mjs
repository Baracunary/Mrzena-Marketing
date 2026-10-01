// Pořídí celostránkové screenshoty ukázkových webů pro sekci #ukazky.
// Spuštění: viz README.md (npm i -D playwright sharp && npx playwright install chromium && node scripts/screenshots.mjs)
//
// URL slouží JEN pro tento skript – do index.html se nikdy nevkládají.

import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'brand', 'portfolio');

const SITES = [
  { slug: 'hypoteka-uspora', url: 'https://zkontrolujhypoteku.cz/' },
  { slug: 'hypoteka-limit', url: 'https://www.poradnabeluca.cz/' },
  { slug: 'sprava-nemovitosti', url: 'https://prostefirma.cz/' },
  { slug: 'registrace-akce', url: 'https://mensi-zemske-valky.vercel.app/' },
];

const VARIANTS = [
  // outWidth = šířka výsledného WebP (zmenšeno kvůli rychlosti webu)
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, outWidth: 1200 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, outWidth: 780 },
];

const WEBP_MAX = 16383; // maximální rozměr WebP
const COOKIE_BUTTONS = /p[řr]ijmout v[šs]e|povolit v[šs]e|souhlas[íi]m|p[řr]ijmout|accept all|allow all|accept/i;

async function dismissCookies(page) {
  for (const frame of page.frames()) {
    try {
      const btn = frame.getByRole('button', { name: COOKIE_BUTTONS }).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ timeout: 2000 });
        await page.waitForTimeout(500);
        return true;
      }
    } catch { /* tlačítko nenalezeno, zkusíme další frame */ }
  }
  return false;
}

async function hideBottomFixed(page) {
  // Skryje fixní/sticky prvky přilepené ke spodku (cookie lišty, chat bubliny)
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.bottom >= window.innerHeight - 4 && r.top > window.innerHeight * 0.4) {
        el.style.setProperty('display', 'none', 'important');
      }
    }
  });
}

async function scrollThrough(page) {
  // Projede stránku, aby se načetly lazy obrázky a spustily scroll animace
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
}

async function waitForAssets(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.complete ? null :
      new Promise(r => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 8000); })));
  });
}

async function shoot(browser, site, variant) {
  const context = await browser.newContext({
    viewport: variant.viewport,
    deviceScaleFactor: variant.deviceScaleFactor,
    isMobile: variant.isMobile,
    hasTouch: variant.isMobile,
    locale: 'cs-CZ',
  });
  const page = await context.newPage();
  await page.goto(site.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);

  if (!(await dismissCookies(page))) await hideBottomFixed(page);

  // Vypnout animace, ať jsou scroll-reveal prvky vidět hned
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;scroll-behavior:auto!important}' });
  await scrollThrough(page);
  await waitForAssets(page);
  await hideBottomFixed(page);
  await page.waitForTimeout(800);

  const png = await page.screenshot({ fullPage: true, type: 'png' });
  await context.close();

  let img = sharp(png).resize({ width: variant.outWidth });
  const { height } = await sharp(await img.toBuffer()).metadata();
  if (height > WEBP_MAX) img = sharp(png).resize({ height: WEBP_MAX });

  const file = path.join(OUT_DIR, `${site.slug}-${variant.name}.webp`);
  const info = await img.webp({ quality: 74, effort: 5 }).toFile(file);
  console.log(`✓ ${path.relative(ROOT, file)}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} kB`);
}

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  for (const site of SITES) {
    for (const variant of VARIANTS) {
      try {
        await shoot(browser, site, variant);
      } catch (err) {
        console.error(`✗ ${site.slug}-${variant.name}: ${err.message}`);
      }
    }
  }
} finally {
  await browser.close();
}
