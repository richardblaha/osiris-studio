#!/usr/bin/env node
/**
 * Lay out the Osiris icon set from the assets synced by `sync-theme.mjs`
 * (`richardblaha/osiris-theme`'s current release already ships a correctly
 * sized `.icns`/`.ico`/hicolor PNG set — no local rasterisation needed for
 * those). The only things still generated here are the handful of raster
 * sizes osiris-theme doesn't publish because they're specific to *this* app's
 * packaging, not the shared design system: Windows Store tile sizes and the
 * browser favicon/PWA ladder for the web server — both resized from the
 * synced 1024px master with `sharp`.
 *
 * Run `pnpm --filter @osiris-studio/branding sync:theme` first; this throws a
 * clear error otherwise. Output lands in `assets/generated/` (git-ignored).
 * Run directly (`node scripts/render-icons.mjs`) or import `renderIcons()` —
 * `apply-branding.mjs` calls it when the folder is missing.
 *
 * CI (`build-desktop`, `build-web`) runs `sync:theme` then this before
 * `prepare:shell`.
 */
import { mkdir, writeFile, rm, copyFile, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { assertSynced, themeSyncDir } from './sync-theme.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const generatedDir = path.join(packageRoot, 'assets', 'generated');
export const themeRawDir = path.join(themeSyncDir, 'raw', 'assets');

const appIconsDir = path.join(themeRawDir, 'icons', 'app');
const watermarksDir = path.join(themeRawDir, 'watermarks');
const fontDir = path.join(themeRawDir, 'fonts', 'fira-code');

/** Every flat PNG size osiris-theme ships under `icons/app/png/osiris-<n>.png`. */
const PNG_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
/** Subset also copied into `electron/icons/` for electron-builder. */
const ELECTRON_PNG_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

async function resizeFrom(masterPng, size, dest) {
  await sharp(masterPng)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest);
}

async function buildIcoFrom(masterPng, dest, sizes) {
  const buffers = await Promise.all(
    sizes.map((s) => sharp(masterPng).resize(s, s, { fit: 'contain' }).png().toBuffer()),
  );
  await writeFile(dest, await pngToIco(buffers));
}

export async function renderIcons({ clean = true } = {}) {
  assertSynced();
  if (!existsSync(path.join(appIconsDir, 'osiris.icns'))) {
    throw new Error(`[branding] ${appIconsDir}: missing synced app icons — re-run sync:theme`);
  }

  if (clean) await rm(generatedDir, { recursive: true, force: true });
  for (const sub of ['png', 'linux', 'win32', 'darwin', 'server', 'electron/icons', 'fonts']) {
    await mkdir(path.join(generatedDir, sub), { recursive: true });
  }

  // Flat PNG ladder, straight from the synced set.
  for (const size of PNG_SIZES) {
    const src = path.join(appIconsDir, 'png', `osiris-${size}.png`);
    await copyFile(src, path.join(generatedDir, 'png', `icon-${size}.png`));
    if (ELECTRON_PNG_SIZES.includes(size)) {
      await copyFile(src, path.join(generatedDir, 'electron', 'icons', `${size}x${size}.png`));
    }
  }
  const master1024 = path.join(appIconsDir, 'png', 'osiris-1024.png');

  // Linux: desktop icon + the full XDG hicolor theme tree (pack-tree.mjs installs it whole).
  await copyFile(
    path.join(appIconsDir, 'png', 'osiris-512.png'),
    path.join(generatedDir, 'linux', 'code.png'),
  );
  await cp(path.join(appIconsDir, 'hicolor'), path.join(generatedDir, 'hicolor'), {
    recursive: true,
  });

  // Windows: .ico copied verbatim; Store tile sizes are Osiris-desktop-specific, resized here.
  await copyFile(
    path.join(appIconsDir, 'osiris.ico'),
    path.join(generatedDir, 'win32', 'code.ico'),
  );
  await copyFile(
    path.join(appIconsDir, 'osiris.ico'),
    path.join(generatedDir, 'electron', 'icon.ico'),
  );
  await resizeFrom(master1024, 70, path.join(generatedDir, 'win32', 'code_70x70.png'));
  await resizeFrom(master1024, 150, path.join(generatedDir, 'win32', 'code_150x150.png'));

  // macOS: .icns copied verbatim.
  await copyFile(
    path.join(appIconsDir, 'osiris.icns'),
    path.join(generatedDir, 'darwin', 'code.icns'),
  );
  await copyFile(
    path.join(appIconsDir, 'osiris.icns'),
    path.join(generatedDir, 'electron', 'icon.icns'),
  );

  // Server: browser favicon (multi-size .ico) + PWA icons — osiris-theme doesn't ship these
  // (they're a REH-server-specific format), resized from the 1024 master instead.
  await buildIcoFrom(master1024, path.join(generatedDir, 'server', 'favicon.ico'), [16, 32, 48]);
  await resizeFrom(master1024, 192, path.join(generatedDir, 'server', 'code-192.png'));
  await resizeFrom(master1024, 512, path.join(generatedDir, 'server', 'code-512.png'));

  // Empty-editor watermarks, copied straight through. osiris-theme ships no separate
  // high-contrast variant — the dark one already reads fine against the hc background.
  await copyFile(
    path.join(watermarksDir, 'letterpress-dark.svg'),
    path.join(generatedDir, 'letterpress-dark.svg'),
  );
  await copyFile(
    path.join(watermarksDir, 'letterpress-light.svg'),
    path.join(generatedDir, 'letterpress-light.svg'),
  );
  await copyFile(
    path.join(watermarksDir, 'letterpress-dark.svg'),
    path.join(generatedDir, 'letterpress-hc.svg'),
  );

  // Bundled Fira Code — copied straight through so a fresh install needs no system font.
  await copyFile(
    path.join(fontDir, 'FiraCode-VF.woff2'),
    path.join(generatedDir, 'fonts', 'FiraCode-VF.woff2'),
  );
  await copyFile(path.join(fontDir, 'LICENSE'), path.join(generatedDir, 'fonts', 'LICENSE'));

  console.log(`[branding] icon set synced → ${path.relative(process.cwd(), generatedDir)}`);
  return generatedDir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await renderIcons();
}
