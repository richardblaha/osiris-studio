#!/usr/bin/env node
/**
 * Sync the Osiris visual identity from richardblaha/osiris-theme's current
 * GitHub Release — the single source of truth for the Osiris Dark / Osiris
 * Light colour themes, the Osiris File Icons theme, the master logo, the
 * prebuilt app-icon set (`.icns`/`.ico`/hicolor PNGs), the empty-editor
 * watermarks and the bundled Fira Code face.
 *
 * Pulls two things:
 *   1. the `osiris-theme-<ver>.vsix` release asset (themes + file icons), and
 *   2. the handful of raw files under `assets/` at the matching git tag
 *      (logo, app icons, watermarks, font) — resolved via the Git Trees API
 *      rather than hard-coded filenames, so a reshuffle upstream is detected
 *      (fewer/renamed matches) instead of silently fetching nothing.
 *
 * Output lands in `assets/.theme-sync/` (git-ignored, same treatment as
 * `assets/generated/`). No local fallback: run this before `render:icons` —
 * an offline/rate-limited sync fails loudly rather than shipping stale
 * branding.
 *
 *   node scripts/sync-theme.mjs              # resolve + fetch "latest"
 *   OSIRIS_THEME_VERSION=v0.1.2 node scripts/sync-theme.mjs
 */
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const themeSyncDir = path.join(packageRoot, 'assets', '.theme-sync');

/** Asset paths (exact) or directory prefixes (trailing `/`) fetched from the tag tree. */
export const ASSET_PATTERNS = [
  'assets/icons/osiris-logo.svg',
  'assets/icons/app/osiris.icns',
  'assets/icons/app/osiris.ico',
  'assets/icons/app/png/',
  'assets/icons/app/hicolor/',
  'assets/watermarks/letterpress-dark.svg',
  'assets/watermarks/letterpress-light.svg',
  'assets/fonts/fira-code/FiraCode-VF.woff2',
  'assets/fonts/fira-code/LICENSE',
  'assets/tokens.json',
];

/** Load `config/theme-upstream.json`; `OSIRIS_THEME_VERSION` overrides the pinned release. */
export async function readThemeConfig() {
  const raw = await readFile(path.join(packageRoot, 'config', 'theme-upstream.json'), 'utf8');
  const config = JSON.parse(raw);
  return {
    repository: config.repository,
    release: process.env.OSIRIS_THEME_VERSION || config.release,
  };
}

/** Resolve `{ repository, release }` ("latest" or a tag) to a concrete GitHub release. */
export async function resolveThemeRelease({ repository, release }, fetchImpl = fetch) {
  const url =
    release === 'latest'
      ? `https://api.github.com/repos/${repository}/releases/latest`
      : `https://api.github.com/repos/${repository}/releases/tags/${release}`;
  const res = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const body = await res.json();
  const vsix = (body.assets ?? []).find((a) => /^osiris-theme-.*\.vsix$/.test(a.name));
  if (!vsix) {
    throw new Error(`${repository}@${body.tag_name}: no osiris-theme-*.vsix release asset found`);
  }
  return {
    tag: body.tag_name,
    version: body.tag_name.replace(/^v/, ''),
    vsixUrl: vsix.browser_download_url,
    vsixName: vsix.name,
  };
}

/** List every blob path in the repo tree at `tag` (Git Trees API, one call, recursive). */
export async function listThemeTree(repository, tag, fetchImpl = fetch) {
  const url = `https://api.github.com/repos/${repository}/git/trees/${tag}?recursive=1`;
  const res = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const body = await res.json();
  if (body.truncated)
    throw new Error(`${repository}@${tag}: tree listing truncated — repo grew too large`);
  return body.tree.filter((e) => e.type === 'blob').map((e) => e.path);
}

/** Pure: filter a flat path list down to the ones {@link ASSET_PATTERNS} wants. */
export function matchAssetPaths(paths, patterns = ASSET_PATTERNS) {
  return paths.filter((p) =>
    patterns.some((pat) => (pat.endsWith('/') ? p.startsWith(pat) : p === pat)),
  );
}

/** Download the vsix, unpack `extension/*` into `<destDir>/vsix/`. */
export async function downloadThemeVsix(release, destDir, fetchImpl = fetch, log = console.log) {
  const res = await fetchImpl(release.vsixUrl);
  if (!res.ok) throw new Error(`GET ${release.vsixUrl} → ${res.status}`);
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'osiris-theme-vsix-'));
  try {
    const vsixPath = path.join(tmp, release.vsixName);
    await writeFile(vsixPath, Buffer.from(await res.arrayBuffer()));
    execFileSync('unzip', ['-q', '-o', vsixPath, 'extension/*', '-d', tmp], { stdio: 'inherit' });
    const vsixDir = path.join(destDir, 'vsix');
    await rm(vsixDir, { recursive: true, force: true });
    await cp(path.join(tmp, 'extension'), vsixDir, { recursive: true });
    log(`[branding] osiris-theme vsix → ${path.relative(packageRoot, vsixDir)}`);
    return vsixDir;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

/** Download every matched raw asset path, preserving its repo-relative layout under `<destDir>/raw/`. */
export async function downloadThemeAssets(
  repository,
  tag,
  paths,
  destDir,
  fetchImpl = fetch,
  log = console.log,
) {
  const rawDir = path.join(destDir, 'raw');
  for (const rel of paths) {
    const url = `https://raw.githubusercontent.com/${repository}/${tag}/${rel}`;
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    const dest = path.join(rawDir, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
  log(
    `[branding] osiris-theme raw assets (${paths.length}) → ${path.relative(packageRoot, rawDir)}`,
  );
  return rawDir;
}

export async function syncTheme({ log = console.log, fetchImpl = fetch } = {}) {
  const config = await readThemeConfig();
  const release = await resolveThemeRelease(config, fetchImpl);

  await rm(themeSyncDir, { recursive: true, force: true });
  await mkdir(themeSyncDir, { recursive: true });

  await downloadThemeVsix(release, themeSyncDir, fetchImpl, log);

  const tree = await listThemeTree(config.repository, release.tag, fetchImpl);
  const assetPaths = matchAssetPaths(tree);
  if (assetPaths.length === 0) {
    throw new Error(
      `${config.repository}@${release.tag}: none of ASSET_PATTERNS matched the tree — layout moved`,
    );
  }
  await downloadThemeAssets(
    config.repository,
    release.tag,
    assetPaths,
    themeSyncDir,
    fetchImpl,
    log,
  );

  await writeFile(
    path.join(themeSyncDir, 'manifest.json'),
    `${JSON.stringify(
      {
        repository: config.repository,
        tag: release.tag,
        version: release.version,
        syncedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  log(
    `[branding] synced osiris-theme ${release.tag} → ${path.relative(packageRoot, themeSyncDir)}`,
  );
  return { ...release, dir: themeSyncDir };
}

/** Throw a clear, actionable error when a build step needs the sync but it hasn't run. */
export function assertSynced(dir = themeSyncDir) {
  if (!existsSync(path.join(dir, 'manifest.json'))) {
    throw new Error(
      '[branding] no synced osiris-theme assets found — run `pnpm --filter @osiris-studio/branding sync:theme` first',
    );
  }
  return dir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await syncTheme();
}
