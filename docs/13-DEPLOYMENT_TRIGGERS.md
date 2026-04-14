# Deployment Triggers Guide

This document explains when builds and deployments are triggered in this project.

## Overview

The workflow has two distinct phases:

1. **Build & Validate** - Runs on all PR events to validate code
2. **Build & Deploy** - Runs only when code should be deployed

## When Builds Happen (Validation)

The **build job** runs to validate your code on:

### ✅ Pull Request Events

- **PR Opened** - When a new pull request is created
- **PR Updated** - When commits are pushed to an existing PR (synchronize)
- **PR Reopened** - When a closed PR is reopened

```bash
# Create and push a PR
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
# Create PR on GitHub
# ✅ Triggers build job to validate code
```

**What happens during build validation:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run linting (fails if linting errors)
5. Build application (fails if build errors)
6. ❌ Does NOT deploy to Azure

This ensures your PR builds successfully before it can be merged.

## When Deployments Happen

Deployments to Azure Static Web Apps occur in the following scenarios:

### ✅ 1. Push to Protected Branches

Deployments are automatically triggered when code is pushed to:
- `main` branch → Deploys to **Production** environment
- `dev` branch → Deploys to **Development** environment

```bash
# Example: Deploy to production
git checkout main
git merge feature/my-feature
git push origin main
# ✅ Triggers production deployment

# Example: Deploy to development
git checkout dev
git merge feature/my-feature
git push origin dev
# ✅ Triggers development deployment
```

### ✅ 2. Merged Pull Requests

Deployments are triggered when a pull request is **merged** (not just closed):

```bash
# Create and merge a PR to main
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
# Create PR on GitHub targeting 'main'
# ✅ Build job runs to validate
# Once PR is approved and merged
# ✅ Build and deploy job runs
```

**Important:** 
- ✅ Merged PR = Build validation + Deployment triggered
- ✅ PR opened/updated = Build validation only
- ❌ Closed PR (without merge) = No deployment (build may have run earlier)

## Build vs Deploy Summary

| Event | Build Validation | Deployment |
|-------|------------------|------------|
| PR Opened | ✅ Yes | ❌ No |
| PR Updated | ✅ Yes | ❌ No |
| PR Reopened | ✅ Yes | ❌ No |
| PR Merged | ✅ Yes | ✅ Yes |
| PR Closed (not merged) | ❌ No | ❌ No |
| Push to `main` | ✅ Yes | ✅ Yes |
| Push to `dev` | ✅ Yes | ✅ Yes |
| Push to feature branch | ❌ No | ❌ No |
| Manual workflow | ✅ Yes | ✅ Yes |

### ✅ 3. Manual Workflow Dispatch

You can manually trigger a deployment from GitHub Actions:

1. Go to **Actions** tab
2. Select **Build and Deploy to Azure**
3. Click **Run workflow**
4. Choose:
   - Branch to deploy from
   - Environment (production or development)
5. Click **Run workflow**

## When Actions DON'T Run

### ❌ No Build or Deployment

The following events do **NOT** trigger any workflow:
- Pushes to branches other than `main` or `dev`
- Closing a PR without merging (workflow already ran when PR was opened)

```bash
git checkout feature/my-feature
git push origin feature/my-feature
# ❌ No build, no deployment (only runs when PR is created)
```

## Deployment Workflow

### Typical Development Flow with PR Validation

```
┌─────────────────────────────────────────────────────────────┐
│  1. Developer creates feature branch                        │
│     git checkout -b feature/new-feature                     │
│     ❌ No workflow triggered                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Developer pushes changes to feature branch              │
│     git push origin feature/new-feature                     │
│     ❌ No workflow triggered yet                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Developer creates PR to 'dev' branch                    │
│     ✅ BUILD JOB RUNS (validation only)                     │
│     • Linting                                                │
│     • TypeScript compilation                                 │
│     • Build succeeds/fails                                   │
│     ❌ No deployment                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Developer pushes updates to PR                          │
│     ✅ BUILD JOB RUNS AGAIN (re-validates)                  │
│     ❌ No deployment                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. PR is reviewed and merged to 'dev'                      │
│     ✅ BUILD & DEPLOY JOB RUNS                              │
│     ✅ DEPLOYS TO DEVELOPMENT ENVIRONMENT                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Test in development environment                         │
│     Manual testing and verification                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Create PR from 'dev' to 'main'                          │
│     ✅ BUILD JOB RUNS (validation)                          │
│     ❌ No deployment yet                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  8. PR is approved and merged to 'main'                     │
│     ✅ BUILD & DEPLOY JOB RUNS                              │
│     ✅ DEPLOYS TO PRODUCTION ENVIRONMENT                     │
└─────────────────────────────────────────────────────────────┘
```

### Alternative: Direct Push Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Developer works on local branch                         │
│     git checkout -b feature/new-feature                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Merge to dev locally and push                           │
│     git checkout dev                                         │
│     git merge feature/new-feature                            │
│     git push origin dev                                      │
│     ✅ DEPLOYMENT TO DEVELOPMENT ENVIRONMENT                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. After testing, merge to main and push                   │
│     git checkout main                                        │
│     git merge dev                                            │
│     git push origin main                                     │
│     ✅ DEPLOYMENT TO PRODUCTION ENVIRONMENT                 │
└─────────────────────────────────────────────────────────────┘
```

## What Happens During Each Job

### Build Job (PR Validation)

Runs on: PR opened, updated, or reopened

**Steps:**
1. **Checkout code** from the PR branch
2. **Setup Node.js 20** with npm caching
3. **Install dependencies** (`npm ci`)
4. **Run linting** (`npm run lint`) - fails if linting errors
5. **Build application** (`npm run build`) - fails if build errors
6. **Result:** ✅ or ❌ status on PR

**Purpose:** Validate that the PR code builds successfully before allowing merge.

### Build and Deploy Job

Runs on: Push to main/dev, merged PRs, manual dispatch

**Steps:**
1. **Set environment variables** (production or development)
2. **Checkout code** from the branch
3. **Setup Node.js 20** with npm caching
4. **Install dependencies** (`npm ci`)
5. **Run linting** (non-blocking, continues on error)
6. **Build application** with environment-specific secrets
7. **Deploy to Azure Static Web Apps**
8. **Result:** Live deployment to Azure

**Purpose:** Build and deploy tested code to the appropriate environment.

### Environment Variables

Different variables are injected based on the target environment:

**Production (main branch):**
```
NODE_ENV=production
VITE_ENVIRONMENT=production
VITE_API_BASE_URL=[production API URL from secrets]
VITE_FIREBASE_*=[production Firebase config from secrets]
```

**Development (dev branch):**
```
NODE_ENV=development
VITE_ENVIRONMENT=development
VITE_API_BASE_URL=[development API URL from secrets]
VITE_FIREBASE_*=[development Firebase config from secrets]
```

## Monitoring Deployments

### Check if Deployment Will Trigger

Before pushing, verify:

1. **Check current branch:**
   ```bash
   git branch --show-current
   # Must be 'main' or 'dev' for automatic deployment
   ```

2. **Check if you're pushing to protected branch:**
   ```bash
   git push origin main    # ✅ Will deploy to production
   git push origin dev     # ✅ Will deploy to development
   git push origin feature # ❌ Will not deploy
   ```

3. **For PRs:** Deployment only happens when merged, not when opened or updated

### View Deployment Status

**GitHub Actions Tab:**
1. Go to repository → **Actions** tab
2. See all workflow runs
3. Green checkmark = Successful deployment
4. Red X = Failed deployment

**Workflow Run Details:**
- Click on any workflow run to see:
  - Which branch triggered it
  - Which environment was deployed to
  - Build logs
  - Deployment URL

**Azure Portal:**
1. Navigate to your Static Web App
2. Go to **Deployments** section
3. View deployment history and status

## Testing Before Deployment

### PR Validation Ensures Quality

Every PR automatically gets validated:

```bash
# Your workflow
git checkout -b feature/new-feature
# ... make changes ...
git push origin feature/new-feature
# Create PR
# ✅ Automatic build validation runs
# ✅ See results in PR checks
```

**Benefits:**
- ✅ Catch build errors before merge
- ✅ Catch linting issues before merge
- ✅ Ensure TypeScript compiles successfully
- ✅ No broken code reaches main or dev branches

### Additional Local Testing

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run linting locally
npm run lint

# Build and preview production build
npm run build
npm run preview
```

### Testing in Development Environment

1. Merge your feature to `dev` branch
2. Deployment to development environment happens automatically
3. Test at the development URL
4. Once verified, create PR to `main` for production

## Rollback Process

If a deployment introduces issues:

### Option 1: Git Revert

```bash
# Revert the problematic commit
git revert <commit-hash>
git push origin main  # or dev
# ✅ Triggers new deployment with reverted code
```

### Option 2: Revert the Merge

```bash
# If the issue was introduced by a merged PR
git revert -m 1 <merge-commit-hash>
git push origin main  # or dev
# ✅ Triggers new deployment
```

### Option 3: Azure Portal

1. Go to Azure Portal
2. Navigate to your Static Web App
3. Go to **Deployments**
4. Find a previous working deployment
5. Click **Activate** to rollback

## Best Practices

1. ✅ **Always test in development first** before promoting to production
2. ✅ **Use pull requests** for code review and approval
3. ✅ **Test builds locally** before pushing to `dev` or `main`
4. ✅ **Monitor deployments** after pushing to ensure success
5. ✅ **Keep dev and main in sync** to avoid conflicts
6. ✅ **Use feature branches** for all development work
7. ❌ **Don't push directly to main** without testing in dev first
8. ❌ **Don't bypass code review** for production deployments

## Quick Reference

| Event | Branch | Build Validation | Deployment | Environment | Notes |
|-------|--------|------------------|------------|-------------|-------|
| Push | `main` | ✅ Yes | ✅ Yes | Production | Requires environment approval if configured |
| Push | `dev` | ✅ Yes | ✅ Yes | Development | Automatic deployment |
| Push | `feature/*` | ❌ No | ❌ No | N/A | No workflow runs |
| PR opened | any → `main` | ✅ Yes | ❌ No | N/A | Build validates code |
| PR updated | any → `main` | ✅ Yes | ❌ No | N/A | Build re-validates |
| PR reopened | any → `main` | ✅ Yes | ❌ No | N/A | Build validates |
| PR merged | any → `main` | ✅ Yes | ✅ Yes | Production | Deploys merged code |
| PR closed (not merged) | any → `main` | ❌ No | ❌ No | N/A | No action |
| PR merged | any → `dev` | ✅ Yes | ✅ Yes | Development | Deploys merged code |
| Manual dispatch | any | ✅ Yes | ✅ Yes | Selected | Choose branch and environment |

## Getting Help

- **Build validation fails:** Check PR for linting or build errors
- **Build fails:** Check Actions tab for error logs
- **Deployment not triggered:** Verify branch name and event type
- **PR checks not running:** Ensure PR targets `main` or `dev` branch
- **Need to deploy urgently:** Use manual workflow dispatch
- **Environment issues:** Check secrets configuration in GitHub settings

---

**Summary:**
1. ✅ **Build validation runs** on all PRs to `main` or `dev` (opened, updated, reopened)
2. ✅ **Deployment happens** on:
   - Push to `main` or `dev` branches
   - Merged pull requests to `main` or `dev`
   - Manual workflow dispatch
2. ✅ Merged pull requests to `main` or `dev`
3. ✅ Manual workflow dispatch

All other events (PR opened, PR updated, pushes to feature branches) do NOT trigger deployments.
