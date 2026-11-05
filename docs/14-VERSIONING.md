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

Releases are fully automated with [semantic-release](https://semantic-release.org/), as the `Release`
step of the **Deploy to Development** workflow (`.github/workflows/deploy-development.yml`). On every
push to `main` it:

1. Analyzes the commits since the last release (Conventional Commits)
2. Determines the next version (patch / minor / major)
3. Generates release notes and updates `CHANGELOG.md`
4. Bumps `package.json` (and `package-lock.json`)
5. Creates a `vX.Y.Z` git tag and a GitHub Release
6. Commits the version bump back to `main`

### Where the release sits in the pipeline

Merging to `main` releases **and** updates the development app; production ships whichever tag you
choose later. That ordering is deliberate: `__APP_VERSION__` and `version.json` come from
`package.json`, and semantic-release pushes its bump commit with `GITHUB_TOKEN` — pushes made with
`GITHUB_TOKEN` do not trigger workflows, so any deploy that ran *before* the release would build the
previous version.

```
push/merge to main ──► Deploy to Development
                          1. verify environment config (fails before anything is tagged)
                          2. semantic-release  ──► bump + tag vX.Y.Z + GitHub release + commit
                          3. resolve sha + version from the working tree
                          4. build (version = X.Y.Z) ──► 5. upload to the development app
                                                    │
                          tag vX.Y.Z now exists ────┴──► Deploy to Production <version>
                                                              checkout tag ──► build ──► production app
```

Details that follow from this:

- `fetch-depth: 0` on both checkouts: semantic-release needs the existing tags to work out the next
  version, and the production deploy needs them to resolve the requested one.
- The development build reads `git rev-parse HEAD` **after** the release step, so the embedded SHA is
  the release commit — the same commit that ends up on `main`.
- If the development upload fails, the tag already exists. Re-running is safe: semantic-release finds
  no new commits, releases nothing, and rebuilds `main`.
- The release commit triggers no workflows (see above), so nothing is deployed twice.
- The production deploy releases nothing. It checks out the requested tag, verifies that commit is on
  `main`, builds it, and uploads it — so production always reports exactly the version you asked for.
  Blank version = the latest tag; `.github/workflows/deploy-production.yml` also rejects unknown tags.
- **Every merge releases something.** There is no longer a "this commit produced no tag" case — the
  catch-all rule turns an unrecognised message into a patch — so whatever is on `main` always has a
  version the production deploy can ship.
- The development app shows the last released version plus a modifier — `v1.2.3 · 437a6f5 ·
  development` — because `formatVersion()` appends the short SHA and environment for any build whose
  `VITE_ENVIRONMENT` is not `production`.

### Commit conventions

`.releaserc.json` overrides the analyzer's default rules. After the specific types comes a catch-all
`{ "release": "patch" }` rule, which matches any commit the earlier rules didn't — so **every merge to
`main` produces a tag**, even when the message has no conventional prefix.

| Commit message                                                    | Version change |
| ----------------------------------------------------------------- | -------------- |
| `feat(scope): …`                                                    | Minor (`1.0.0 -> 1.1.0`) |
| `fix(scope): …`, `perf(scope): …`, `revert: …`                      | Patch (`1.0.0 -> 1.0.1`) |
| anything else — `chore:`, `docs:`, `ci:`, or no prefix at all       | Patch |
| `feat!: …`, `type(scope)!: …`, `BREAKING CHANGE:` footer            | Major (`1.0.0 -> 2.0.0`) |

Worth knowing:

- Prefixes still decide *how far* the version moves. An unprefixed message is no longer swallowed, but
  it books a feature as a patch.
- `type!:` only reaches major because of the explicit header rule (`{ "header": "*!: *" }`) in
  `.releaserc.json`. With the default angular parser a `!` header is otherwise unparsed — it used to
  produce no release at all. The `BREAKING CHANGE:` footer is the canonical form and needs no rule.
- The analyzer picks the highest matching release for a commit, so the catch-all can never downgrade a
  `feat:` to a patch.
- **Squash-merge uses the PR title as the commit message**, so the PR title is what gets analyzed.

### Branch protection

The git plugin pushes the version bump back to `main`. If branch protection
requires pull requests, add an exception for the GitHub Actions bot token, or
the push (and therefore the release) will fail.

## 6. CI wiring

The deploy workflows pass `VITE_GIT_SHA` to the build so every CI build embeds the exact commit it was
built from. `deploy-development.yml` resolves it from `git rev-parse HEAD` after the release step (so
it is the release commit), and `deploy-production.yml` resolves it from the tag it checked out; both
print the built version in the run summary. `VITE_ENVIRONMENT` is set per workflow (`production` /
`development`), and `ci.yml` does the same for pull-request validation builds.

## Files involved

| File                                          | Purpose                                    |
| --------------------------------------------- | ------------------------------------------ |
| `vite.config.ts`                              | Injects `__APP_VERSION__`, `__BUILD_SHA__`, `__BUILD_TIMESTAMP__`, `__BUILD_ENVIRONMENT__` |
| `src/vite-env.d.ts`                           | Type declarations for injected globals     |
| `src/version.ts`                              | Version metadata + display helpers         |
| `scripts/generate-version.mjs`                | Writes `public/version.json`               |
| `src/components/HomePage/HomePage.tsx`        | Sidebar version readout                    |
| `.github/workflows/deploy-development.yml`    | Releases `main` (semantic-release), then builds + deploys it to development |
| `.github/workflows/deploy-production.yml`     | Deploys a chosen release tag to production |
| `.github/workflows/ci.yml`                    | Builds + tests pull requests               |
| `.releaserc.json`                             | semantic-release plugin/config             |
| `package.json`                                | `generate:version` script; source of truth for version |
