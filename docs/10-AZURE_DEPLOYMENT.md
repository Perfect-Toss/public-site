# Azure Deployment with GitHub Actions

This document describes how to deploy the public-site application to Azure Static Web Apps using GitHub Actions.

## Overview

The application uses GitHub Actions to automatically build and deploy to Azure Static Web Apps: `main` deploys to
the production app, `dev` deploys to the development app, and pull requests are validated without deploying.

## Prerequisites

1. An Azure account with an active subscription
2. Azure Static Web Apps resource created in your Azure portal
3. GitHub repository with appropriate permissions

## Setup Instructions

### 1. Create Azure Static Web App

1. Go to the [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" and search for "Static Web App"
3. Click "Create"
4. Fill in the details:
   - **Subscription**: Select your Azure subscription
   - **Resource Group**: Create new or select existing
   - **Name**: Choose a name for your static web app (e.g., `perfect-toss-public-site`)
   - **Plan type**: Choose Free or Standard based on your needs
   - **Region**: Select a region close to your users
   - **Deployment source**: Select "Other" (we'll use GitHub Actions)
5. Click "Review + Create" then "Create"

### 2. Get the Deployment Token

1. After the Static Web App is created, navigate to it in the Azure Portal
2. Go to "Settings" → "Configuration" in the left sidebar
3. Click on "Manage deployment token"
4. Copy the deployment token (you'll need this for GitHub)

### 3. Add GitHub Secrets

**Important**: You need to configure multiple secrets for this deployment.

See the complete guide: **[GitHub Secrets Setup Guide](11-GITHUB_SECRETS_SETUP.md)**

Quick summary of required secrets:
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token from Azure, set **per environment**
  (`production` and `development`), not at repository level
- Firebase configuration (7 secrets: API key, auth domain, project ID, etc.)
- `VITE_API_BASE_URL` - Your backend API URL

Follow the detailed instructions in the [GitHub Secrets Setup Guide](11-GITHUB_SECRETS_SETUP.md) to add all required secrets.

### 4. Configure Environment Variables (Optional)

If your application requires environment variables for the build process (e.g., Firebase config, API keys):

1. In your Azure Static Web App, go to "Settings" → "Environment variables"
2. Add any necessary environment variables
3. For build-time variables, you can also add them to the deploy workflows in `.github/workflows/deploy-production.yml` and `.github/workflows/deploy-development.yml` under the "Build application" step

#### Adding Environment Variables to GitHub Actions

Edit the workflow file and add your environment variables:

```yaml
- name: Build application
  run: npm run build
  env:
    VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
    VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
    # Add other variables as needed
```

Then add these secrets in GitHub repository settings. Don't set `NODE_ENV` here — `vite build` already
builds in production mode, and `NODE_ENV=development` would ship React's development bundle.

## Workflow Details

The deployment is split into one workflow per environment, plus a validation workflow:

| Workflow | Trigger | Target |
|----------|---------|--------|
| `.github/workflows/ci.yml` | pull request to `main` / `dev` | none — tests + build only |
| `.github/workflows/deploy-development.yml` | push to `dev`, manual | development Static Web App |
| `.github/workflows/deploy-production.yml` | push to `main`, manual | production Static Web App |

Each deploy workflow runs the same steps:

## Build Output

- **Build command**: `npm run build` (runs version generation, ESLint, TypeScript compilation and Vite build)
- **Output directory**: `dist` (Vite's default output directory)
- **Base URL**: Configured in `vite.config.ts`

## Deployment Environments

- **Production**: Deployed when code is pushed to `main` (or manually)
- **Development**: Deployed when code is pushed to `dev` (or manually)

Each environment is a separate Azure Static Web App with its own deployment token stored as a GitHub
environment secret. Pull requests do **not** create Azure preview environments.

See [Environment-Based Deployment Guide](12-ENVIRONMENT_BASED_DEPLOYMENT.md) for setup details.

## Monitoring Deployments

1. **GitHub Actions Tab**: View build and deployment logs
2. **Azure Portal**: Monitor the Static Web App resource
   - View deployment history
   - Check application logs
   - Monitor performance metrics

## Custom Domains

To add a custom domain:

1. In Azure Portal, navigate to your Static Web App
2. Go to "Settings" → "Custom domains"
3. Click "Add" and follow the instructions to configure DNS
4. Azure will provide CNAME records to add to your DNS provider

## Troubleshooting

### Build Fails

- Check the GitHub Actions logs for specific error messages
- Ensure all dependencies are correctly listed in `package.json`
- Verify that the build runs successfully locally with `npm run build`

### Deployment Token Issues

- Ensure the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret is correctly set in GitHub
- The token can be regenerated in Azure Portal if needed

### Environment Variables Not Working

- For Vite applications, environment variables must be prefixed with `VITE_`
- Ensure variables are added both in GitHub Secrets and referenced in the workflow
- Build-time variables need to be in the workflow; runtime variables can be in Azure

### Application Not Loading

- Check the browser console for errors
- Verify that all environment variables are properly configured
- Ensure the output directory is correctly set to `dist` in the workflow

## Manual Deployment

To trigger a deployment manually:

1. Go to the GitHub Actions tab in your repository
2. Select **Deploy to Production** or **Deploy to Development**
3. Click "Run workflow"
4. Select the branch to build from and click "Run workflow"

Only **Build and Validate** (`ci.yml`) is offered for pull-request validation; it never deploys.

## Security Considerations

- Never commit sensitive tokens or secrets to the repository
- Use GitHub Secrets for all sensitive configuration
- Regularly rotate deployment tokens
- Review the deployment logs for any security warnings
- Consider enabling Azure Static Web App authentication for restricted areas

## Additional Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vite Build Documentation](https://vitejs.dev/guide/build.html)
