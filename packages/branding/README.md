# @osiris-studio/branding

Everything that makes an Osiris build _look_ like Osiris — synced from
[`richardblaha/osiris-theme`](https://github.com/richardblaha/osiris-theme)'s
current release, not hand-authored here. This package resolves that release,
lays its assets out for the two app builds, and carries the
`product.json` overlay + shared product metadata.

- **`scripts/sync-theme.mjs`** — resolves `richardblaha/osiris-theme`'s current
  GitHub Release (pin one in `config/theme-upstream.json`, or override per-run
  with `OSIRIS_THEME_VERSION`), downloads the `osiris-theme-<ver>.vsix` (the real
  _Osiris Dark_/_Osiris Light_ colour themes + _Osiris File Icons_) and, from the
  matching git tag, the master logo, the prebuilt app-icon set
  (`.icns`/`.ico`/hicolor PNGs), the empty-editor watermarks and the bundled Fira
  Code face. Everything lands in `assets/.theme-sync/` (git-ignored). No local
  fallback — run it before anything else; an offline/rate-limited sync fails
  loudly rather than shipping stale branding.
- **`scripts/render-icons.mjs`** — lays the synced set out into
  `assets/generated/` for every consumer. Only the Windows Store tile sizes and
  the web server's browser favicon/PWA icons are actually _generated_
  (resized from the synced 1024px master with `sharp`) — everything else
  (`.icns`, `.ico`, the XDG hicolor tree) is copied through verbatim, since
  osiris-theme already ships those correctly sized.
  `pnpm --filter @osiris-studio/branding render:icons`.
- **`scripts/apply-to-checkout.mjs`** — `copyBrandingIntoCheckout(dir, { kind })`:
  copies the rendered icons + font into a cloned upstream tree, appends the Fira
  Code `@font-face`, and renames the workspace config folder `.vscode` → `.osiris`
  (`rewriteConfigFolder`, tolerant regex over a curated file list). Imported by
  both apps' `apply-branding.mjs`.
- **`scripts/bundle-extensions.mjs`** — `bundleBuiltinExtensions({ repoRoot,
extensionsDir, build })`: unpacks the first-party `.vsix` set
  (`FIRST_PARTY_EXTENSIONS` = `osiris-workspace`) into a distribution's
  `extensions/` dir, and repackages the synced `osiris-theme` vsix's own
  `themes/`/`fileicons/` as a generated built-in extension (`buildThemeManifest`
  re-wraps the vsix's manifest verbatim — this package invents none of its own
  theme contributions). Called by both apps' branding step.
- **`product.overlay.json`** — the subset of VSCodium's `product.json` that Osiris
  overrides (name, app ids, `.osiris*` data dirs, URL protocol, Open VSX gallery,
  telemetry off, initial theme). `apps/*/scripts/apply-branding.mjs` deep-merges it.
- **`assets/metadata.json`** / **`src/metadata.ts`** — product identity (name,
  bundle id, links) mirrored for non-TS consumers; the one thing still
  hand-maintained here — see `assets/README.md`.

```ts
import { metadata, loadProductOverlay, resolveIcon } from '@osiris-studio/branding';

console.log(metadata.productNameLong); // "Osiris Studio"
const overlay = await loadProductOverlay(); // → merge into product.json
const icnsPath = resolveIcon('icns'); // → electron-builder mac icon (requires sync:theme + render:icons to have run)
```

See `assets/README.md` for the full sync → render → apply pipeline and the
complete asset map.
