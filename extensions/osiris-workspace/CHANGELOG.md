# Change Log

## Unreleased

- DevContainer enforcement is now mandatory: `osiris.devcontainer.enforce` is
  gone, and the local-window guard no longer offers "Close Folder" — the only
  way past the modal is to reopen in a DevContainer.
- Removed session handover (`osiris.workspace.suspendSession`/`resumeSession`,
  the session-phase status bar item, `server-config.ts`) — unrelated to
  DevContainer enforcement and unused.

## [0.1.0-alpha.1] - 2026-09-03

- `extensionKind: ["ui"]` — the extension is now the host-side controller.
- Osiris Start: recent-projects webview + `osiris.startup.restoreLast` /
  `showStartView`; `New Project…` scaffolds a folder and opens it in a DevContainer.
- `osiris.desktop.ensureDevContainer` registered locally — runs `devcontainer up`
  via a CLI wrapper (no dockerode in the bundle), starts the in-container server,
  records the project.
- Agent API keys: `osiris.agent.setApiKey` (OS keychain) + `--remote-env` injection.
- Resolver rebuilds a missing container from the recent-projects entry.

## 0.1.0

- Initial scaffold: `osiris-devcontainer` remote authority resolver, local-window
  DevContainer guard, `Open Folder in DevContainer`, `Handover to Server` /
  `Fetch to Local` commands driving `@richardblaha/protocol`'s `HandoverClient`, and a
  session-location status bar item.
