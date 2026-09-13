/**
 * Stage the Osiris first-party extensions + colour/icon theme as **built-in**
 * extensions inside a distribution.
 *
 * "Built-in" = a plain folder under the app's `extensions/` directory (next to
 * upstream's `git`, `typescript-language-features`, …). They are always enabled,
 * cannot be uninstalled, and are not auto-updated — the right shape for a
 * distribution's own extensions.
 *
 * Both distributions call {@link bundleBuiltinExtensions}:
 *   - desktop → `<app>/resources/app/extensions/`   (from the VSCodium prebuilt)
 *   - web     → `<reh-bundle>/extensions/`           (from the gulp REH build)
 *
 * The theme extension it writes is a straight repackaging of the
 * `osiris-theme-<ver>.vsix` release asset synced by `sync-theme.mjs` — Osiris
 * Dark / Osiris Light + Osiris File Icons, not a locally hand-built theme.
 * The pure manifest transform ({@link buildThemeManifest}) is unit-tested; the
 * filesystem + `unzip` work is exercised by the build workflows.
 */
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertSynced, themeSyncDir } from './sync-theme.mjs';

/** Extension workspace dirs (`extensions/<name>`) shipped in every Osiris build. */
export const FIRST_PARTY_EXTENSIONS = ['osiris-workspace'];

/** Folder name of the generated built-in theme extension. */
export const THEME_EXTENSION_DIR = 'osiris-theme';

/**
 * The `package.json` for the bundled theme extension, derived from the synced
 * `osiris-theme-<ver>.vsix`'s own manifest so its theme/icon-theme/editor-default
 * contributions stay verbatim. Pure.
 *
 * @param {object} vsixPkg  parsed `package.json` from the synced vsix's `extension/`
 */
export function buildThemeManifest(vsixPkg) {
  return {
    name: THEME_EXTENSION_DIR,
    displayName: 'Osiris Theme',
    description: 'Osiris Studio colour + file-icon themes, synced from richardblaha/osiris-theme.',
    version: vsixPkg.version,
    publisher: 'osiris-studio',
    license: vsixPkg.license ?? 'MIT',
    engines: vsixPkg.engines ?? { vscode: '^1.90.0' },
    categories: ['Themes'],
    contributes: vsixPkg.contributes,
  };
}

/** Write `<extensionsDir>/osiris-theme/` from the synced vsix (manifest + `themes/` + `fileicons/`). */
export async function writeThemeExtension(extensionsDir, log = console.log) {
  assertSynced();
  const vsixDir = path.join(themeSyncDir, 'vsix');
  const vsixPkg = JSON.parse(await readFile(path.join(vsixDir, 'package.json'), 'utf8'));
  const dest = path.join(extensionsDir, THEME_EXTENSION_DIR);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });

  await writeFile(
    path.join(dest, 'package.json'),
    `${JSON.stringify(buildThemeManifest(vsixPkg), null, 2)}\n`,
  );
  await cp(path.join(vsixDir, 'themes'), path.join(dest, 'themes'), { recursive: true });
  await cp(path.join(vsixDir, 'fileicons'), path.join(dest, 'fileicons'), { recursive: true });
  log(`[branding] built-in theme → extensions/${THEME_EXTENSION_DIR}`);
}

/**
 * Unpack the `extension/` subtree of a `.vsix` into `<extensionsDir>/<dirName>/`.
 * Uses the system `unzip` (already required by the prebuilt fetch step).
 */
export async function stageVsixAsBuiltin(vsixPath, extensionsDir, dirName, log = console.log) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'osiris-builtin-'));
  try {
    execFileSync('unzip', ['-q', '-o', vsixPath, 'extension/*', '-d', tmp], { stdio: 'inherit' });
    const dest = path.join(extensionsDir, dirName);
    await rm(dest, { recursive: true, force: true });
    await mkdir(extensionsDir, { recursive: true });
    await cp(path.join(tmp, 'extension'), dest, { recursive: true });
    log(`[branding] built-in extension → extensions/${dirName}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

/**
 * Stage every first-party extension + the theme into `extensionsDir`.
 *
 * @param {object}   opts
 * @param {string}   opts.repoRoot       monorepo root (holds `extensions/<name>/`)
 * @param {string}   opts.extensionsDir  the distribution's built-in `extensions/` dir
 * @param {boolean} [opts.build]         `pnpm --filter <name> package` a missing `.vsix`
 * @param {(m: string) => void} [opts.log]
 */
export async function bundleBuiltinExtensions({
  repoRoot,
  extensionsDir,
  build = false,
  log = console.log,
}) {
  if (!existsSync(extensionsDir)) {
    throw new Error(`[branding] built-in extensions dir not found: ${extensionsDir}`);
  }
  for (const name of FIRST_PARTY_EXTENSIONS) {
    const extDir = path.join(repoRoot, 'extensions', name);
    const vsix = path.join(extDir, `${name}.vsix`);
    if (!existsSync(vsix)) {
      if (!build)
        throw new Error(`[branding] ${name}.vsix missing — run \`pnpm --filter ${name} package\``);
      log(`[branding] packaging ${name}…`);
      execFileSync('pnpm', ['--filter', name, 'package'], { cwd: repoRoot, stdio: 'inherit' });
    }
    await stageVsixAsBuiltin(vsix, extensionsDir, name, log);
  }
  await writeThemeExtension(extensionsDir, log);
}
