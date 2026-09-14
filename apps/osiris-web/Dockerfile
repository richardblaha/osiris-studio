# syntax=docker/dockerfile:1

# ---- runtime stage ----
#
# No build stage: the REH server bundle (clone OpenVSCode Server, npm ci,
# gulp build — network- and toolchain-heavy) is already produced natively by
# build-web.yml's `server-bundle` job and fed in below as the `reh-bundle`
# build context (see that job's `docker/build-push-action` step) — a
# *separate* context, not a subdirectory of `context: .`, so
# apps/osiris-web/.dockerignore's `**/.build`/`**/node_modules` rules (which
# would otherwise strip out the bundle, including the native modules gulp
# can't bundle, e.g. node-pty) never apply to it. Redoing that multi-GB build
# a second time inside a Docker build stage was redundant and unreliable
# under buildkit's sandboxed container.
#
# Everything else copied below is plain .mjs using only Node built-ins
# (server/index.mjs, scripts/lib.mjs) — no install step needed in this image.
FROM node:22-bookworm-slim AS runtime
LABEL org.opencontainers.image.title="Osiris Studio (web)" \
      org.opencontainers.image.source="https://github.com/osiris-studio/osiris" \
      org.opencontainers.image.licenses="MIT"

RUN groupadd --gid 1001 osiris && useradd --uid 1001 --gid osiris --create-home osiris
WORKDIR /home/osiris/app

COPY --chown=osiris:osiris apps/osiris-web/server ./apps/osiris-web/server
COPY --chown=osiris:osiris apps/osiris-web/scripts ./apps/osiris-web/scripts
COPY --chown=osiris:osiris apps/osiris-web/config ./apps/osiris-web/config
COPY --chown=osiris:osiris apps/osiris-web/package.json ./apps/osiris-web/package.json
COPY --from=reh-bundle --chown=osiris:osiris vscode-reh-web-linux-x64 ./apps/osiris-web/.build/vscode-reh-web-linux-x64
# Only readProductOverlay()'s fallback path needs this — a static committed
# file, not the generated theme/icon assets (already baked into the REH
# bundle above by the native build).
COPY --chown=osiris:osiris packages/branding/product.overlay.json ./packages/branding/product.overlay.json

ENV OSIRIS_TELEMETRY=off \
    VSCODE_SERVER_DATA_DIR=/home/osiris/.osiris-server \
    NODE_ENV=production

USER osiris
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "apps/osiris-web/server/index.mjs"]
CMD ["--host", "0.0.0.0", "--port", "3000"]
