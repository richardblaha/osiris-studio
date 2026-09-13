#!/usr/bin/env node
/**
 * Wrap a branded linux-x64 prebuilt tree into a single-file Flatpak bundle.
 *
 *   node scripts/pack-flatpak.mjs                       # .build/linux-x64 → dist_electron/
 *   node scripts/pack-flatpak.mjs <sourceTree> <out>    # explicit paths
 *
 * Needs `flatpak` + `flatpak-builder` on PATH, plus `org.freedesktop.Platform`/
 * `Sdk` `24.08` and `org.electronjs.Electron2.BaseApp` `24.08` installed from the
 * `flathub` remote (CI installs these before packaging; see build-desktop.yml).
 * Not for Flathub submission — `flatpak build-bundle` produces a portable
 * `.flatpak` file installable with `flatpak install --user osiris-studio.flatpak`.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { appRoot, readUpstreamConfig, stageDir } from './lib.mjs';
import { flatpakManifest } from './pack-linux.mjs';
import { buildWrapperRoot } from './pack-tree.mjs';

const APP_ID = 'io.osiris.Studio';

export async function packFlatpak(sourceTree, out) {
  const work = `${out}.flatpak-work`;
  const wrapperRoot = path.join(work, 'wrapper');
  const buildDir = path.join(work, 'build');
  const repoDir = path.join(work, 'repo');
  await rm(work, { recursive: true, force: true });
  await buildWrapperRoot(sourceTree, wrapperRoot);

  const manifestPath = path.join(wrapperRoot, `${APP_ID}.json`);
  await writeFile(manifestPath, JSON.stringify(flatpakManifest({ appId: APP_ID }), null, 2));

  execFileSync('flatpak-builder', ['--force-clean', `--repo=${repoDir}`, buildDir, manifestPath], {
    cwd: wrapperRoot,
    stdio: 'inherit',
  });

  await mkdir(path.dirname(out), { recursive: true });
  await rm(out, { recursive: true, force: true });
  execFileSync('flatpak', ['build-bundle', repoDir, out, APP_ID], { stdio: 'inherit' });

  await rm(work, { recursive: true, force: true });
  console.log(`[osiris-desktop] ${path.relative(appRoot, out)}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [tree, out] = process.argv.slice(2);
  const { release } = await readUpstreamConfig();
  await packFlatpak(
    tree ?? stageDir('linux-x64'),
    out ?? path.join(appRoot, 'dist_electron', `Osiris-linux-x64-${release}.flatpak`),
  );
}
