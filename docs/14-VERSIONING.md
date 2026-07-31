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

## 5. Releasing a new version

The release workflow (`.github/workflows/release.yml`) runs on any `v*` tag. It
verifies the tag matches `package.json` and then creates a GitHub Release with
auto-generated release notes.

### Cutting a release

```bash
# 1. Bump the version (patch / minor / major) — updates package.json + creates a tag
npm version patch
# or: npm version minor
# or: npm version major

# 2. Push the commit and tag
git push
git push --tags
```

Order of events:

1. Pushing the commit to `main` triggers the normal deploy workflow →
   production is updated and `version.json` reflects the new version.
2. Pushing the `vX.Y.Z` tag triggers `release.yml` → a GitHub Release is
   created with generated release notes.

> To make the tag match `package.json`, always bump with `npm version` (which
> creates the tag) rather than `git tag` by hand.

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
| `.github/workflows/release.yml`               | Creates GitHub Releases on `v*` tags       |
| `package.json`                                | `generate:version` script; source of truth for version |
