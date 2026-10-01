# MRZENA Marketing – web

Statický one-page web (`index.html`) nasazený na Vercelu z větve `main`.

## Screenshoty pro sekci „Ukázky webů“ (#ukazky)

Náhledy webů v sekci #ukazky jsou statické WebP screenshoty ve složce `brand/portfolio/`.
Na weby klientů se ze stránky nikdy neodkazuje – jejich URL jsou jen ve skriptu.

Skript `scripts/screenshots.mjs` pro každý web pořídí:

- desktop full-page screenshot (viewport 1440×900, uloženo zmenšené na šířku 1200 px),
- mobilní full-page screenshot (390×844, deviceScaleFactor 2, uloženo na šířku 780 px,
  velmi dlouhé stránky se zmenší na max. výšku 16 383 px – limit formátu WebP),

před focením odklikne cookie lištu („Přijmout vše“ apod.), případně skryje fixní prvky
u spodního okraje, projede stránku kvůli lazy obrázkům a počká na fonty a obrázky.

### Spuštění

```bash
npm i -D playwright sharp
npx playwright install chromium
node scripts/screenshots.mjs
```

Výstup: `brand/portfolio/<slug>-desktop.webp` a `brand/portfolio/<slug>-mobile.webp`.

Po novém focení zkontrolujte rozměry obrázků (skript je vypíše) a případně upravte atributy
`width`/`height` u odpovídajících `<img>` v sekci #ukazky v `index.html`.

### Přidání dalšího webu

1. Přidejte `{ slug, url }` do pole `SITES` ve `scripts/screenshots.mjs` a spusťte skript.
2. Zkopírujte jednu kartu `<article class="ux-card">` v sekci #ukazky, změňte `data-ux`,
   cesty k obrázkům, štítek, název, popis a tagy. Modal se naplní z karty automaticky.
