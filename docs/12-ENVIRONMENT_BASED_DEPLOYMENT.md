# Environment-Based Deployment Guide

This guide explains how to set up and use environment-based deployments for production and development environments.

## Overview

The deployment workflow now supports two environments:

- **Production** - Deploys from `main` branch to production Azure Static Web App
- **Development** - Deploys from `dev` branch to development Azure Static Web App

## GitHub Environments Setup

### Step 1: Create Environments in GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Environments**
3. Create two environments:

#### Production Environment

1. Click **New environment**
2. Name: `production`
3. Configure protection rules (recommended):
   - ☑️ **Required reviewers** (add team members who should approve production deployments)
   - ☑️ **Wait timer** (optional: add a delay before deployment)
   - ☑️ **Deployment branches** - Select "Selected branches" and add `main`
4. Click **Save protection rules**

#### Development Environment

1. Click **New environment**
2. Name: `development`
3. Configure protection rules (optional):
   - ☑️ **Deployment branches** - Select "Selected branches" and add `dev`
4. Click **Save protection rules**

### Step 2: Add Environment-Specific Secrets

No config value is shared between the two apps, so **every** secret is defined twice — same name,
different value per environment. Full list and instructions: [GitHub Secrets Setup Guide](11-GITHUB_SECRETS_SETUP.md).

#### Production Secrets

1. Go to **Settings** → **Environments** → **production**
2. Add environment secrets:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` - **production** Static Web App token
   - `VITE_API_BASE_URL` - production API URL
   - `VITE_FIREBASE_*` - production Firebase project config (7 values)

#### Development Secrets

1. Go to **Settings** → **Environments** → **development**
2. Add environment secrets:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` - **development** Static Web App token
   - `VITE_API_BASE_URL` - development API URL
   - `VITE_FIREBASE_*` - development Firebase project config (7 values)

### Step 3: Remove Repository-Level Config

**Settings** → **Secrets and variables** → **Actions** should hold **no** `VITE_*` secrets and no
`AZURE_STATIC_WEB_APPS_API_TOKEN`.

Environment secrets override repository secrets, but a repository-level value is used whenever the
environment's copy is missing — and that fallback is invisible. With prod values at repository level,
a half-configured `development` environment would happily build `dev` against the production backend.

Instead, each deploy workflow checks every required value up front and fails with a named list:

```
::error::Missing environment secret(s) on 'development': VITE_API_BASE_URL, VITE_FIREBASE_APP_ID
```

`ci.yml` uses no secrets at all — the unit tests and the build don't read `VITE_*` values.

## Deployment Workflows

| Workflow | Trigger | Target |
|----------|---------|--------|
| `.github/workflows/ci.yml` | PR to `main` / `dev`, manual | none — tests + build only |
| `.github/workflows/deploy-development.yml` | push to `dev`, manual | development app |
| `.github/workflows/deploy-production.yml` | push to `main`, manual | production app |

Check which environment a run used in the Actions list: the run is titled **Deploy to Production**
or **Deploy to Development**, and the job shows the environment's deployment URL.

### Automatic Deployments

#### Production (main branch)
```bash
# Triggers production deployment
git checkout main
git push origin main
```

**What happens:**
1. Workflow uses `production` environment
2. Sets `VITE_ENVIRONMENT=production`
3. Uses production secrets (including the production deployment token)
4. Deploys to the production Azure Static Web App
5. If reviewers are required, waits for approval

#### Development (dev branch)
```bash
# Triggers development deployment
git checkout dev
git push origin dev
```

**What happens:**
1. `Deploy to Development` workflow uses the `development` environment
2. Sets `VITE_ENVIRONMENT=development`
3. Uses development secrets (including the development deployment token)
4. Deploys to the development Azure Static Web App
5. No approval required (typically)

### Manual Deployments

Each environment has its own workflow, so you pick the workflow rather than an input:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Development** or **Deploy to Production**
3. Click **Run workflow**
4. Choose the **branch** to build from (any branch; the workflow decides the target app)
5. Click **Run workflow**

This allows you to deploy:
- Production code to development environment (for testing)
- Development code to production environment (emergency fixes)

### Pull Request Deployments

When pull requests are **merged** to `main` or `dev` branches, they trigger deployments:

```bash
# Create a PR to main
git checkout -b feature/new-feature
git push origin feature/new-feature
# Create PR targeting main on GitHub

# When PR is merged:
# ✅ Triggers deployment to production environment
```

**Important Notes:**
- ❌ Opening or updating a PR does NOT create preview environments
- ❌ Closing a PR without merging does NOT trigger deployment
- ✅ Merging a PR pushes to the target branch, and that **push** is what deploys
  (the workflow does not deploy from `pull_request` events, so nothing is deployed twice)
- The merged code is deployed to the environment of the target branch (main → production, dev → development)

For testing before merge:
- Test locally with `npm run dev` and `npm run build && npm run preview`
- Or merge to `dev` branch first to test in development environment

## Environment Variables in Your App

The workflow now injects `VITE_ENVIRONMENT` which you can use in your application:

```typescript
// src/config.ts
export const config = {
  environment: import.meta.env.VITE_ENVIRONMENT, // 'production' or 'development'
  apiUrl: import.meta.env.VITE_API_BASE_URL,
  isProduction: import.meta.env.VITE_ENVIRONMENT === 'production',
  isDevelopment: import.meta.env.VITE_ENVIRONMENT === 'development',
};

// Usage in components
if (config.isDevelopment) {
  console.log('Debug information:', data);
}
```

## Azure Setup for Multiple Environments

### Create Two Azure Static Web Apps

#### Production Static Web App

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new Static Web App
3. Name: `perfect-toss-public-site-prod`
4. Region: Choose closest to users
5. Plan: Standard (or Free for testing)
6. Deployment source: Other
7. Copy the deployment token → Add to GitHub `production` environment secrets

#### Development Static Web App

1. Create another Static Web App
2. Name: `perfect-toss-public-site-dev`
3. Region: Same as production
4. Plan: Free (sufficient for dev)
5. Deployment source: Other
6. Copy the deployment token → Add to GitHub `development` environment secrets

## Branch Strategy

### Recommended Git Workflow

```
┌─────────────┐
│   feature   │  Feature branches
│   branches  │  (feature/*, bugfix/*)
└──────┬──────┘
       │ PR
       ▼
┌─────────────┐
│     dev     │  Development branch
│             │  Auto-deploys to dev Azure
└──────┬──────┘
       │ PR (after testing)
       ▼
┌─────────────┐
│    main     │  Production branch
│             │  Auto-deploys to prod Azure
│             │  (may require approvals)
└─────────────┘
```

**Workflow:**
1. Create feature branch from `dev`
2. Develop and test locally
3. Create PR to `dev` → Get preview environment
4. Merge to `dev` → Auto-deploy to development
5. Test in development environment
6. Create PR from `dev` to `main`
7. Review and approve
8. Merge to `main` → Deploy to production (with approval if configured)

## Environment-Specific Configuration Examples

### Different Firebase Projects

**Production Environment Secrets:**
```
VITE_FIREBASE_PROJECT_ID=perfect-toss-prod
VITE_FIREBASE_API_KEY=AIza...prod_key...
VITE_FIREBASE_AUTH_DOMAIN=perfect-toss-prod.firebaseapp.com
```

**Development Environment Secrets:**
```
VITE_FIREBASE_PROJECT_ID=perfect-toss-dev
VITE_FIREBASE_API_KEY=AIza...dev_key...
VITE_FIREBASE_AUTH_DOMAIN=perfect-toss-dev.firebaseapp.com
```

### Different API Endpoints

**Production:**
```
VITE_API_BASE_URL=https://api.perfect-toss.com
```

**Development:**
```
VITE_API_BASE_URL=https://dev-api.perfect-toss.com
```

## Monitoring Deployments

### Check Deployment Status

**Via GitHub:**
1. Go to **Actions** tab
2. View running/completed workflows
3. Check which environment was deployed
4. View deployment URL in workflow output

**Via Azure Portal:**
1. Go to your Static Web App resource
2. View deployment history
3. Check active deployment

### View Deployment URLs

Each environment has its own URL:

**Production:**
- `https://perfect-toss-public-site-prod.azurestaticapps.net`
- Custom domain: `https://perfect-toss.com` (if configured)

**Development:**
- `https://perfect-toss-public-site-dev.azurestaticapps.net`
- Custom domain: `https://dev.perfect-toss.com` (if configured)

## Approval Workflow for Production

If you configured required reviewers for production:

1. Developer pushes to `main` or creates PR to `main`
2. Workflow starts and waits for approval
3. Reviewer gets notification
4. Reviewer reviews changes and approves deployment
5. Deployment proceeds to production

## Troubleshooting

### Wrong Environment Deployed

**Problem:** Changes pushed to `dev` but deployed to production (or vice versa)

**Solution:**
- Check which branch you pushed to
- Verify you ran the workflow for that environment (`Deploy to Development` vs `Deploy to Production`)
- Check workflow run logs to see which environment was used

### Environment Secrets Not Found

**Problem:** The `Verify environment configuration` step fails

**Solution:**
- The error names every missing secret, e.g. `Missing environment secret(s) on 'development': VITE_API_BASE_URL`
- Add each one under **Settings** → **Environments** → that environment
- Check secret names match exactly (case-sensitive, including the `VITE_` prefix)
- Do not add repository-level fallbacks — the guard exists so a wrong environment fails loudly instead
  of deploying another environment's config

### Production Deployment Stuck

**Problem:** Deployment waiting indefinitely

**Solution:**
- Check if reviewers are required for production environment
- Ensure reviewers have been added to the environment
- Check reviewers' notifications for approval request

### Different Behavior in Dev vs Prod

**Problem:** App works in dev but not in production

**Solution:**
- Verify environment-specific secrets are correct
- Check Firebase authorized domains include both URLs
- Verify API CORS allows both Azure URLs
- Check `VITE_ENVIRONMENT` variable usage in code
- Test production build locally: `npm run build && npm run preview`

## Security Best Practices

1. ✅ **Use separate Firebase projects** for dev and prod
2. ✅ **Require approvals** for production deployments
3. ✅ **Limit production access** to senior team members
4. ✅ **Test in development** before promoting to production
5. ✅ **Use different API keys** for each environment
6. ✅ **Monitor both environments** separately
7. ✅ **Rotate secrets regularly** in both environments
8. ✅ **Review deployment logs** after each production deploy

## Quick Reference

| Action | Branch | Environment | Approval | URL |
|--------|--------|-------------|----------|-----|
| Push to main (incl. merged PR) | `main` | production | Yes* | prod URL |
| Push to dev (incl. merged PR) | `dev` | development | No | dev URL |
| PR to main / dev | any | none — build validation only | n/a | n/a |
| Manual deploy | any | selectable | Depends | selected env |

*If configured in environment settings

## Additional Resources

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Azure Static Web Apps Environments](https://docs.microsoft.com/en-us/azure/static-web-apps/review-publish-pull-requests)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

---

**Next Steps:**
1. Create `production` and `development` environments in GitHub
2. Add environment-specific secrets
3. Create Azure Static Web Apps for both environments
4. Create `dev` branch if it doesn't exist
5. Test deployment to development first
6. Configure production approvers
7. Deploy to production
