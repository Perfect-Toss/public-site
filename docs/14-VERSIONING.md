# Versioning & Release Guide

This document describes how the public-site app is versioned and released.

## Overview

Versioning is handled in four complementary layers:

1. **Release / semantic versioning** — human-readable `v1.2.3` tags tied to GitHub Releases.
2. **Build metadata** — version + git SHA + environment + timestamp embedded into every build at compile time.
3. **Runtime exposure** — the current version shown in the expanded sidebar, plus a `version.json` you can curl to see what's deployed.
4. **Content versioning** — Vite content-hashes assets so users never get stale bundles. A socket-based push notification for new versions is planned for later.

---

## 1. How build metadata is injected

`vite.config.ts` defines four compile-time globals (via Vite's `define`):

| Global               | Source                                                        |
| -------------------- | ------------------------------------------------------------- |
| `__APP_VERSION__`    | `version` from `package.json`                                 |
| `__BUILD_SHA__`      | `VITE_GIT_SHA` env, else short `git HEAD` (falls back to `unknown`) |
| `__BUILD_TIMESTAMP__`| Build time (ISO 8601)                                         |
| `__BUILD_ENVIRONMENT__` | `VITE_ENVIRONMENT` env, defaults to `development`          |

These are read in `src/version.ts`, which exports:

- `APP_VERSION` — the full metadata object
- `IS_PRODUCTION` — convenience boolean
- `formatVersion()` — display helper

> **Production display**: `formatVersion()` returns only `v1.2.3` in production.
> The git SHA and environment are intentionally **not** shown in prod. They are
> only appended for non-production builds (e.g. `v1.2.3 · a1b2c3d · development`).

Type declarations for the globals live in `src/vite-env.d.ts`.

## 2. `version.json` (what's deployed)

The `npm run generate:version` script (`scripts/generate-version.mjs`) writes
`public/version.json` before each build:

```json
{
  "version": "1.2.3",
  "sha": "a1b2c3d",
  "environment": "production",
  "buildTime": "2026-07-31T12:00:00.000Z"
}
```

- It runs automatically as part of `npm run build` (first step).
- The file is **gitignored** (`public/version.json`) — it is always regenerated.
- It is uploaded with the app, so `GET /version.json` on any deployed
  environment tells you exactly which build is live.

## 3. Sidebar version readout

The current version is displayed at the very bottom of the **expanded** sidebar
(`src/components/HomePage/HomePage.tsx`). It is hidden when the sidebar is
collapsed. In non-production builds, hovering it shows the build timestamp.

## 4. Planned: new-version push notifications

> Removed for now — a polling timer + refresh banner was not the right approach.
> A socket-based push solution will be worked out later so the app can notify
> users the moment a new build ships, without periodic polling.

## 5. Releasing a new version (semantic-release)

Releases are fully automated with [semantic-release](https://semantic-release.org/)
(`.github/workflows/semantic-release.yml`). On every push to `main` it:

1. Analyzes the commits since the last release (Conventional Commits)
2. Determines the next version (patch / minor / major)
3. Generates release notes and updates `CHANGELOG.md`
4. Bumps `package.json` (and `package-lock.json`)
5. Creates a `vX.Y.Z` git tag and a GitHub Release
6. Commits the version bump back to `main` — which re-triggers the Azure
   deploy, so the live app carries the released version

### Commit conventions

| Commit message                      | Version change          |
| ----------------------------------- | ----------------------- |
| `fix(...)`                          | Patch (`1.0.0 -> 1.0.1`) |
| `feat(...)`                         | Minor (`1.0.0 -> 1.1.0`) |
| `feat!` / `BREAKING CHANGE:` footer | Major (`1.0.0 -> 2.0.0`) |

### Branch protection

The git plugin pushes the version bump back to `main`. If branch protection
requires pull requests, add an exception for the GitHub Actions bot token, or
the push (and therefore the release) will fail.

## 6. CI wiring

`.github/workflows/azure-deploy.yml` passes `VITE_GIT_SHA: ${{ github.sha }}` to
both build steps so every CI build embeds the exact commit it was built from.
`VITE_ENVIRONMENT` is already set per-environment (production on `main`, development on `dev`).

## Files involved

| File                                          | Purpose                                    |
| --------------------------------------------- | ------------------------------------------ |
| `vite.config.ts`                              | Injects `__APP_VERSION__`, `__BUILD_SHA__`, `__BUILD_TIMESTAMP__`, `__BUILD_ENVIRONMENT__` |
| `src/vite-env.d.ts`                           | Type declarations for injected globals     |
| `src/version.ts`                              | Version metadata + display helpers         |
| `scripts/generate-version.mjs`                | Writes `public/version.json`               |
| `src/components/HomePage/HomePage.tsx`        | Sidebar version readout                    |
| `.github/workflows/azure-deploy.yml`          | Passes `VITE_GIT_SHA` to builds            |
| `.github/workflows/semantic-release.yml`      | Runs semantic-release on push to `main`    |
| `.releaserc.json`                             | semantic-release plugin/config             |
| `package.json`                                | `generate:version` script; source of truth for version |
