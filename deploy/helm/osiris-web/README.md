# osiris-web Helm chart

Deploys the Osiris Studio web runtime (`ghcr.io/richardblaha/osiris-studio/osiris-web`,
built from `apps/osiris-web/Dockerfile`) as a single stateless Deployment + Service
(+ optional Ingress).

Published as an OCI artifact by `release.yml`/`build-web.yml` on every version
tag, and attached to the matching GitHub Release as a plain `.tgz`.

## Install

```bash
helm install osiris-web oci://ghcr.io/richardblaha/osiris-studio/charts/osiris-web --version <ver>
```

or from the release asset:

```bash
helm install osiris-web ./osiris-web-<ver>.tgz
```

Useful overrides:

```bash
helm install osiris-web oci://ghcr.io/richardblaha/osiris-studio/charts/osiris-web --version <ver> \
  --set ingress.enabled=true \
  --set ingress.host=osiris.example.com \
  --set server.token=<connection-token>
```

See `values.yaml` for the full set of knobs (image, replicas, service type,
resources, ingress, `OSIRIS_TELEMETRY`/env passthrough, connection token via
`server.token` or a pre-existing `server.existingTokenSecret`).

## Known limitation

No persistence by default (`persistence.enabled: false`) — a workspace/session
opened in one pod is gone if it's rescheduled. Set `persistence.enabled: true`
(with a `storageClass`) for per-user workspace persistence; this only gives the
pod a durable `/home/osiris/.osiris-server`, it doesn't add multi-replica
session affinity — `replicaCount` should stay `1` if you turn it on.

## Local development

```bash
helm lint .
helm template . | less
```
