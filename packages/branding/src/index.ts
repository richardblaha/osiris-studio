import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export { metadata } from './metadata.js';
export type { OsirisMetadata, OsirisColors } from './metadata.js';

/** Absolute path to the package root (works from `dist/` after compilation). */
const packageRoot = fileURLToPath(new URL('../', import.meta.url));

export const assetsDir = join(packageRoot, 'assets');
/** Everything synced from richardblaha/osiris-theme's current release (git-ignored). */
export const themeSyncDir = join(assetsDir, '.theme-sync');
/** Icon set laid out by `scripts/render-icons.mjs` from the sync (git-ignored, built in CI). */
export const generatedIconsDir = join(assetsDir, 'generated');

export type IconTarget = 'svg' | 'png' | 'ico' | 'icns';

const ICONS: Record<IconTarget, string> = {
  svg: '.theme-sync/raw/assets/icons/osiris-logo.svg',
  png: 'generated/png/icon-1024.png',
  ico: 'generated/electron/icon.ico',
  icns: 'generated/electron/icon.icns',
};

/** Resolve an absolute path to a branding icon asset (rasters require `render-icons` to have run). */
export function resolveIcon(target: IconTarget): string {
  return join(assetsDir, ICONS[target]);
}

/** The master logo SVG, synced from osiris-theme (`assets/icons/osiris-logo.svg` upstream). */
export const masterIconPath = join(themeSyncDir, 'raw', 'assets', 'icons', 'osiris-logo.svg');

/**
 * Single-tone empty-editor watermarks, keyed by workbench theme kind. osiris-theme
 * ships no separate high-contrast variant — `hc` reuses `dark`, same as `render-icons.mjs`.
 */
export const letterpressPaths = {
  dark: join(generatedIconsDir, 'letterpress-dark.svg'),
  light: join(generatedIconsDir, 'letterpress-light.svg'),
  hc: join(generatedIconsDir, 'letterpress-hc.svg'),
} as const;

/** Bundled Fira Code, synced from osiris-theme — shipped so a fresh install needs no system font. */
export const fontPaths = {
  firaCodeWoff2: join(generatedIconsDir, 'fonts', 'FiraCode-VF.woff2'),
  license: join(generatedIconsDir, 'fonts', 'LICENSE'),
} as const;

/** Colour + file-icon themes, straight from the synced `osiris-theme-<ver>.vsix`. */
export const themePaths = {
  dark: join(themeSyncDir, 'vsix', 'themes', 'osiris-dark-color-theme.json'),
  light: join(themeSyncDir, 'vsix', 'themes', 'osiris-light-color-theme.json'),
} as const;

export const productOverlayPath = join(packageRoot, 'product.overlay.json');

/** Load the VSCodium `product.json` overlay as a plain object. */
export async function loadProductOverlay(): Promise<Record<string, unknown>> {
  const raw = await readFile(productOverlayPath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  delete parsed.$comment;
  return parsed;
}
