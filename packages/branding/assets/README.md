# Osiris branding assets

Osiris Studio does **not** hand-author its visual identity. Every icon, colour
theme, file-icon theme, empty-editor watermark and the bundled editor font come
from [`richardblaha/osiris-theme`](https://github.com/richardblaha/osiris-theme)'s
current GitHub Release — the single source of truth for the OSIRIS design
system across every surface it ships to (VS Code, GTK, GNOME Shell, browsers,
Forgejo, …). This package only _syncs_ and _applies_ that release.

## Sync → render → apply

```bash
pnpm --filter @osiris-studio/branding sync:theme     # → assets/.theme-sync/ (git-ignored)
pnpm --filter @osiris-studio/branding render:icons   # → assets/generated/   (git-ignored)
```

| Step   | Script                                                           | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sync   | `scripts/sync-theme.mjs`                                         | Resolves `richardblaha/osiris-theme`'s current release (pin one in `config/theme-upstream.json` or via `OSIRIS_THEME_VERSION`), downloads the `osiris-theme-<ver>.vsix` (themes + file icons) and the matching tag's raw assets (logo, prebuilt app icons, watermarks, Fira Code) into `assets/.theme-sync/`. No local fallback — an offline/rate-limited run fails loudly.                                                                                                          |
| Render | `scripts/render-icons.mjs`                                       | Lays the synced app-icon set out into `assets/generated/` for every consumer (`.icns`/`.ico`/hicolor PNGs copied verbatim — osiris-theme already ships them correctly sized). Only two things are actually _generated_ here, resized from the synced 1024px master with `sharp` because osiris-theme doesn't publish them (they're specific to this app's own packaging, not the shared design system): the Windows Store tile sizes and the web server's browser favicon/PWA icons. |
| Apply  | `scripts/apply-to-checkout.mjs`, `scripts/bundle-extensions.mjs` | Copy `assets/generated/*` into a cloned upstream checkout, and repackage the synced vsix's `themes/`/`fileicons/` as the `osiris-theme` built-in extension. Called automatically by both apps' `apply-branding.mjs`.                                                                                                                                                                                                                                                                 |

| Output (`assets/generated/`)                       | Target                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `png/icon-{16..1024}.png`                          | generic ladder, PWA manifest, docs                                                      |
| `linux/code.png`, `hicolor/**`                     | `resources/linux/code.png`, XDG icon theme tree for `.deb`/`.rpm`/AppImage/snap/Flatpak |
| `darwin/code.icns`                                 | `resources/darwin/code.icns`                                                            |
| `win32/code.ico`, `code_{70x70,150x150}.png`       | `resources/win32/*`                                                                     |
| `server/favicon.ico`, `code-{192,512}.png`         | `resources/server/*` (both distributions)                                               |
| `electron/icon.{ico,icns}`, `electron/icons/*.png` | `apps/osiris-desktop/build/*` for electron-builder                                      |
| `letterpress-{dark,light,hc}.svg`                  | empty-editor watermark (osiris-theme ships no separate `hc` variant — `dark` is reused) |
| `fonts/{FiraCode-VF.woff2,LICENSE}`                | bundled editor font, embedded as a `@font-face` `data:` URI                             |

CI (`build-desktop`, `build-web`) and the F5 `prepare:*` tasks run `sync:theme`
then `render:icons` before `prepare:shell`.

`metadata.json` is the one thing still hand-maintained here (mirror of
`src/metadata.ts` — product name/ids/links, consumed where TypeScript isn't
available); it does not attempt to mirror osiris-theme's live colour tokens.
