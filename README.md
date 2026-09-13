<div align="center">

<img src="https://raw.githubusercontent.com/richardblaha/osiris-theme/main/assets/icons/osiris-logo.svg" width="120" alt="Osiris Studio" />

# Osiris Studio

**A custom, open-source developer platform built from VS Code (Code - OSS / VSCodium core) — for desktop and the browser.**

[![CI](https://github.com/richardblaha/osiris-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/richardblaha/osiris-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](LICENSE)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/richardblaha/osiris-studio)

</div>

---

## What is this?

Osiris Studio is a **downstream distribution** of [Code - OSS](https://github.com/microsoft/vscode)
(assembled through the [VSCodium](https://github.com/VSCodium/vscodium) pipeline) with:

- **Osiris branding** — product name, icons, colour + file-icon themes
  (`Osiris Dark` / `Osiris Light` / _Osiris File Icons_) — all synced at build time from
  [`richardblaha/osiris-theme`](https://github.com/richardblaha/osiris-theme)'s current
  release, never hand-authored in this repo.
- **First-party extension** shipped in the box: `osiris-workspace` — DevContainer
  enforcement and session handover.
- Two delivery targets:
  - `apps/osiris-desktop` — Electron packages for Linux, macOS and Windows.
  - `apps/osiris-web` — a browser-served runtime following the OpenVSCode Server pattern.

> The upstream VS Code source is **never vendored** into this repo. The desktop/web
> builds clone a pinned upstream tag at build time and apply Osiris overlays + patches.

This is the IDE half of Osiris. The agent/platform half — CLI, `osiris-kind-operator`,
`osiris-server` API, and the crew/backlog/memory engine — lives in
[`osiris-ai`](https://github.com/richardblaha/osiris).

## Try it in the browser

[**Open in GitHub Codespaces**](https://codespaces.new/richardblaha/osiris-studio) —
spins up `apps/osiris-web`, branded and built, with port 3000 forwarded. Good for a
quick preview, and functionally a running deployment if that's all you need
(see `apps/osiris-web/README.md`).

## Run it locally (F5)

Open the repo in VS Code (or Osiris Studio itself) and press **F5**:

| Configuration              | What it runs                                                      |
| -------------------------- | ----------------------------------------------------------------- |
| **Run Osiris Desktop**     | fetches + rebrands the VSCodium prebuilt, launches it             |
| **Run Osiris Web**         | brands + builds the OpenVSCode Server bundle, runs it on `:3000`  |
| **Debug osiris-workspace** | extension-host debug session for the `osiris-workspace` extension |

Each prelaunch task runs `sync:theme` → `render:icons` first (see
`packages/branding/README.md`), so branding is always current before the app starts.

## Repository layout

```text
osiris-studio/
├── apps/
│   ├── osiris-desktop/   # Electron wrapper, OS packaging, branding entrypoint
│   └── osiris-web/       # Web runtime / standalone server
├── packages/
│   ├── branding/         # Syncs branding from osiris-theme; product.json overlay, asset metadata
│   ├── container-sync/   # DevContainer template sync + digest tracking
│   └── lm-proxy/         # OpenAI-compatible shim over the editor Language Model API
├── extensions/
│   └── osiris-workspace/ # DevContainer enforcement + session handover
├── features/
│   └── src/web-ide/      # DevContainer feature: openvscode-server + launcher
├── deploy/
│   └── helm/osiris-web/  # Helm chart for the web runtime
└── toolchain/
    ├── eslint-config/    # Shared flat ESLint config
    └── tsconfig/         # Shared TypeScript base configs
```

## Shared packages come from `osiris-ai`

`shared-core`, `protocol` and `agent-core` are used on both sides of the split
(server/cli/crew in `osiris-ai`, extensions/packages here), so they live in
`osiris-ai` and are published to **GitHub Packages** under the `@richardblaha`
scope instead of being duplicated. This repo consumes them as normal versioned
`dependencies` (see `.npmrc` and the `package.json` of `extensions/osiris-workspace`,
`packages/container-sync`, `packages/lm-proxy`).

To install locally or in CI you need a token with `read:packages` scope for
`npm.pkg.github.com`:

```bash
export NODE_AUTH_TOKEN=<a classic PAT with read:packages>
pnpm install
```

CI reads the same token from the `PACKAGES_READ_TOKEN` repository secret. This
is required even though both repos and packages are public: GitHub Packages'
npm registry always requires authentication (unlike ghcr.io, which allows
anonymous pulls of public images), and the automatic `GITHUB_TOKEN` can only
read packages published from the _same_ repository — it 403s cross-repo
regardless of visibility. A PAT is the only thing that works across repos.

## Prerequisites

- **Node.js 22 LTS** (`nvm use` reads `.nvmrc`)
- **pnpm 9** (`corepack enable`)
- For desktop builds: the platform toolchain VS Code itself requires
  (`git`, Python 3, a C/C++ compiler, and on Linux the `libx11`/`libsecret` dev packages).

## Quickstart

```bash
corepack enable
export NODE_AUTH_TOKEN=<a classic PAT with read:packages>  # see above
pnpm install

pnpm build        # build every package + extension (Turborepo)
pnpm test         # vitest across packages + extension logic
pnpm lint         # eslint (flat config)
pnpm typecheck    # tsc -b across the workspace
pnpm package      # produce .vsix / dist_electron artifacts
```

## Releases

Pushing a `v*` tag runs `.github/workflows/release.yml`, which builds both
delivery targets and cuts a (draft) GitHub Release. Branding on every artifact
below is synced from `osiris-theme`'s current release at build time.

**Desktop** (`apps/osiris-desktop`, rebranded VSCodium prebuilt):

| Artifact                            | Install                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `*.vsix`                            | first-party `osiris-workspace` extension                               |
| `Osiris-<os>-<arch>-*.{tar.gz,zip}` | portable archive — extract, run `bin/osiris`                           |
| `Osiris-linux-x64-*.AppImage`       | `chmod +x`, run                                                        |
| `Osiris-linux-x64-*.snap`           | `sudo snap install --dangerous --classic Osiris-linux-x64-*.snap`      |
| `Osiris-linux-x64-*_amd64.deb`      | `sudo apt install ./Osiris-linux-x64-*_amd64.deb`                      |
| `Osiris-linux-x64-*.x86_64.rpm`     | `sudo dnf install ./Osiris-linux-x64-*.x86_64.rpm`                     |
| `Osiris-linux-x64-*.flatpak`        | `flatpak install --user ./Osiris-linux-x64-*.flatpak` (not on Flathub) |

**Web** (`apps/osiris-web`, browser-served OpenVSCode Server):

| Artifact                     | Install                                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `osiris-web-server-*.tar.gz` | extract, `node server/index.mjs --port 3000`                                                                                                              |
| Docker image                 | `docker run -p 3000:3000 ghcr.io/richardblaha/osiris-studio/osiris-web:<tag>`                                                                             |
| Helm chart                   | `helm install osiris-web oci://ghcr.io/richardblaha/osiris-studio/charts/osiris-web --version <ver>` (also attached to the release as `osiris-web-*.tgz`) |

See `apps/osiris-desktop/README.md`, `apps/osiris-web/README.md` and
`deploy/helm/osiris-web/README.md` for the full detail on each.

## License

MIT — see [LICENSE](LICENSE). Osiris Studio is a downstream distribution built from
Microsoft's Code - OSS via the VSCodium build pipeline; the upstream source is fetched
at build time and is not redistributed within this repository.
