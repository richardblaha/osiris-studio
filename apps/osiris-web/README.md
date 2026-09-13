# @osiris-studio/web

Browser-served Osiris Studio runtime, following the **OpenVSCode Server** pattern.
Like `@osiris-studio/desktop`, it clones a pinned upstream tag at build time and applies
the Osiris `product.json` overlay — no VS Code source is vendored. Branding (colour
theme, file icons, watermarks, font) is synced from
[`richardblaha/osiris-theme`](https://github.com/richardblaha/osiris-theme)'s current
release — see `packages/branding/README.md`.

## Run locally

Press **F5** → "Run Osiris Web" (runs the `prepare: web` task first, which does
everything below), or by hand:

```bash
# system deps (Debian/Ubuntu): pkg-config libx11-dev libxkbfile-dev libsecret-1-dev libkrb5-dev
pnpm --filter @osiris-studio/branding sync:theme       # pull the current osiris-theme release
pnpm --filter @osiris-studio/branding render:icons     # lay out icons/font/watermarks from the sync
pnpm --filter @osiris-studio/web run prepare:shell     # clone gitpod-io/openvscode-server @ config/upstream.json + brand
pnpm --filter @osiris-studio/web build:shell           # build the web server bundle (heavy, ~30 min)
node apps/osiris-web/server/index.mjs --port 3000
# open http://localhost:3000
```

## Try it without installing anything

Open this repo in **GitHub Codespaces** (badge in the root `README.md`, or
`https://codespaces.new/richardblaha/osiris-studio`) — the devcontainer runs the
same `sync:theme` → `render:icons` → `prepare:shell` → `build:shell` pipeline once
at creation, then `pnpm --filter @osiris-studio/web start` brings it up with
port 3000 auto-forwarded. Good for a quick preview, and a Codespace _is_ a running
deployment of the web server if you want to just use it that way.

`build:shell` writes the bundle to `apps/osiris-web/.build/vscode-reh-web-<platform>-<arch>/`;
the wrapper picks it up from there automatically.

`server/index.mjs` is a thin wrapper: it parses a stable CLI (`--port`, `--host`,
`--token`), forces `OSIRIS_TELEMETRY=off`, sets the server data dir, prints a
banner, and execs the upstream server entrypoint with the rest of the args.
`node server/index.mjs --help` works even without a build (used as a CI smoke test).

## Docker

```bash
# build context is the REPO ROOT so the workspace is available
docker build -f apps/osiris-web/Dockerfile -t osiris-web .
docker run --rm -p 3000:3000 osiris-web
```

Multi-stage: the build stage clones + brands (`sync:theme` → `render:icons`) +
builds; the runtime stage is `node:22-bookworm-slim`, non-root (`uid 1001`),
`EXPOSE 3000`, with a healthcheck.

Every version tag pushes a real image to GHCR — `build-web.yml`'s `docker` job
only pushes when invoked from `release.yml` (a plain `workflow_dispatch` run just
builds, for CI-only checks):

```bash
docker run --rm -p 3000:3000 ghcr.io/richardblaha/osiris-studio/osiris-web:<tag>
```

## Kubernetes (Helm)

A chart lives at [`deploy/helm/osiris-web`](../../deploy/helm/osiris-web) —
`release.yml` packages and pushes it to GHCR as an OCI artifact alongside the
image, and attaches the `.tgz` to the GitHub Release too:

```bash
helm install osiris-web oci://ghcr.io/richardblaha/osiris-studio/charts/osiris-web --version <ver>
```

See the chart's own README for the full set of values (ingress, connection
token, resources, persistence).

## Files

| Path                           | Role                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `config/upstream.json`         | pinned OpenVSCode Server repo + tag                                                      |
| `scripts/clone-upstream.mjs`   | idempotent shallow clone                                                                 |
| `scripts/apply-branding.mjs`   | product.json overlay (+ telemetry off)                                                   |
| `scripts/lib.mjs`              | `mergeDeep`, overlay loader, entrypoint finder (tested)                                  |
| `server/index.mjs`             | Osiris CLI wrapper around the upstream server — also what F5's "Run Osiris Web" launches |
| `Dockerfile` / `.dockerignore` | container image, pushed to GHCR on a release                                             |
