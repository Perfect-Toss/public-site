# Perfect Toss Public Site

A React + TypeScript web application built with Vite, featuring Firebase authentication and automatic deployment to Azure.

## Features

- ⚛️ React 18 with TypeScript
- ⚡ Vite for blazing fast development
- 🔥 Firebase Authentication (Magic Link, Google, Apple)
- 🎨 Font Awesome icons
- 🚀 Automated deployment to Azure Static Web Apps
- 🔀 React Router for navigation
- 📝 OpenAPI type-safe API client

## Quick Start

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Firebase account
- Azure account (for deployment)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
4. Edit `.env` and add your Firebase configuration

5. Start development server:
   ```bash
   npm run dev
   ```

## Development

```bash
# Start dev server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Generate API types from OpenAPI spec
npm run generate:api
```

## Deployment

This project uses GitHub Actions for automated deployment to Azure Static Web Apps.

### Initial Setup

Follow the deployment checklist: **[docs/DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md)**

Quick links:
- [Azure Deployment Guide](./docs/10-AZURE_DEPLOYMENT.md)
- [GitHub Secrets Setup](./docs/11-GITHUB_SECRETS_SETUP.md)

### Automatic Deployments

- **Production**: Automatically deploys on push to `main` branch
- **Preview**: Creates preview environment for each pull request
- **Manual**: Trigger deployment from GitHub Actions tab

### Releases & Versioning

Releases are automated with **semantic-release**. On every push to `main`, it analyzes commit messages (Conventional Commits), bumps the version, updates `CHANGELOG.md`, creates a `vX.Y.Z` git tag + GitHub Release, and commits the version bump back to `main` (which re-deploys the app with the released version).

**Commit conventions that trigger releases:**

| Commit message               | Version change          |
| ---------------------------- | ----------------------- |
| `fix(scope): ...`            | Patch (`1.0.0 -> 1.0.1`) |
| `feat(scope): ...`           | Minor (`1.0.0 -> 1.1.0`) |
| `feat!` / `BREAKING CHANGE:` | Major (`1.0.0 -> 2.0.0`) |

```bash
git commit -m "fix: correct tablet sync timing"
git commit -m "feat(devices): add bulk export"
git commit -m "feat!: drop legacy API support"
```

Other prefixes (`chore:`, `docs:`, `refactor:`, `test:`) do **not** trigger a release. The released version is shown at the bottom of the expanded sidebar and at `/version.json`. See the [Versioning & Release Guide](./docs/14-VERSIONING.md) for full details.

> **Branch protection:** semantic-release pushes the version bump back to `main`. If branch protection requires pull requests, add an exception for the GitHub Actions bot token or releases will fail.

## Documentation

- [Firebase Setup](./docs/01-FIREBASE_SETUP.md)
- [Firebase Integration](./docs/02-FIREBASE_INTEGRATION.md)
- [Magic Link Authentication](./docs/03-MAGIC_LINK_AUTH.md)
- [Home Page](./docs/04-HOME_PAGE.md)
- [API Integration](./docs/05-API_INTEGRATION.md)
- [TypeScript Migration](./docs/06-TYPESCRIPT_MIGRATION.md)
- [API Management](./docs/07-API_MANAGEMENT.md)
- [Font Awesome Icons](./docs/08-FONT_AWESOME.md)
- [React Router Migration](./docs/09-REACT_ROUTER_MIGRATION.md)
- [Azure Deployment](./docs/10-AZURE_DEPLOYMENT.md)
- [GitHub Secrets Setup](./docs/11-GITHUB_SECRETS_SETUP.md)
- [Versioning & Release Guide](./docs/14-VERSIONING.md)

## Project Structure

```
public-site/
├── .github/
│   └── workflows/          # GitHub Actions workflows
├── docs/                   # Documentation
├── public/                 # Static assets
├── scripts/                # Build and utility scripts
└── src/
    ├── api/               # API client and types
    ├── assets/            # Images and static resources
    ├── components/        # React components
    ├── contexts/          # React contexts (Auth, etc.)
    └── firebase/          # Firebase configuration
```

## Technology Stack

- **Framework**: React 18
- **Language**: TypeScript 6
- **Build Tool**: Vite 5
- **Authentication**: Firebase Auth
- **Routing**: React Router v7
- **Icons**: Font Awesome
- **API Client**: openapi-fetch
- **Deployment**: Azure Static Web Apps
- **CI/CD**: GitHub Actions

## Icons

This project uses [Font Awesome](https://fontawesome.com/) for all icons. See [docs/08-FONT_AWESOME.md](./docs/08-FONT_AWESOME.md) for usage guide and examples.
