# GitHub Secrets Setup Guide

This guide walks through the secrets needed for automated deployment to Azure.

## Where secrets go

This project deploys to **two** separate Azure Static Web Apps, and *no* config value is shared
between them. Every secret therefore has to be defined **twice** — once per GitHub environment,
under the **same name** — and **never at repository level**:

| Secret | `production` environment | `development` environment |
|--------|--------------------------|---------------------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | production app token | development app token |
| `VITE_API_BASE_URL` | production API URL | development API URL |
| `VITE_FIREBASE_API_KEY` | production Firebase | development Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | production Firebase | development Firebase |
| `VITE_FIREBASE_PROJECT_ID` | production Firebase | development Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | production Firebase | development Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | production Firebase | development Firebase |
| `VITE_FIREBASE_APP_ID` | production Firebase | development Firebase |
| `VITE_FIREBASE_MEASUREMENT_ID` (optional) | production Firebase | development Firebase |

Why not repository level: environment secrets override repository secrets, but a repository-level
secret is used whenever the environment's copy is missing. That fallback is invisible — it would
build `dev` against production config (or deploy to the wrong app). The deploy workflows therefore
check that every value above is present on the selected environment and fail with a named list if
anything is missing.

`ci.yml` (pull-request validation) intentionally uses **no** secrets: the tests and the build do not
read `VITE_*` values, so PR checks cannot depend on either environment's config.

## Required Secrets

### 1. Azure Deployment Token (one per GitHub environment)

The workflow deploys `main` to **production** and `dev` to **development**. The token secret has the
same name in both environments, but a different value:

- Go to **Settings** → **Environments** → `production` → **Add environment secret**
  - `AZURE_STATIC_WEB_APPS_API_TOKEN` = deployment token of the **production** Static Web App
- Go to **Settings** → **Environments** → `development` → **Add environment secret**
  - `AZURE_STATIC_WEB_APPS_API_TOKEN` = deployment token of the **development** Static Web App

Get each token from the matching Azure Static Web App: **Overview** → **Manage deployment token**
(or **Settings** → **Configuration** → **Manage deployment token**). See [Azure Setup Guide](10-AZURE_DEPLOYMENT.md).

> Do **not** keep `AZURE_STATIC_WEB_APPS_API_TOKEN` at repository level. Environment secrets take
> priority, and a repository-level copy would silently deploy to whichever app it points at.

### 2. Firebase Configuration

Get these values from your Firebase Console: [https://console.firebase.google.com/](https://console.firebase.google.com/)

1. Go to your Firebase project
2. Click the gear icon (⚙️) → **Project settings**
3. Scroll down to **Your apps** section
4. Select your web app (or create one if needed)
5. Copy the values from the **Firebase configuration object**

| Secret Name | Example Value | Description |
|------------|---------------|-------------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyC1x2y3z4...` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789012` | Firebase Cloud Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | `1:123456789012:web:abc123...` | Firebase App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Google Analytics Measurement ID (optional) |

### 3. API Configuration

| Secret Name | Example Value | Description |
|------------|---------------|-------------|
| `VITE_API_BASE_URL` | `https://api.perfect-toss.com` | Your backend API URL (different per environment) |

## Step-by-Step Instructions

### Adding Secrets to a GitHub environment

Repeat for **both** environments (`production` and `development`), using the values that belong to
that environment:

1. Navigate to your repository on GitHub
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Environments**, then the environment name (`production` or `development`)
4. Under **Environment secrets**, click **Add secret**
5. For each secret listed above:
   - Enter the **Name** (exactly as shown, including the `VITE_` prefix)
   - Enter the value for *this* environment
   - Click **Add secret**

### Example: Adding Firebase API Key

```
Name: VITE_FIREBASE_API_KEY
Value: AIzaSyC1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m
```

Click **Add secret**

### Verifying Secrets

After adding all secrets:

1. Go to **Settings** → **Environments** → `production` / `development`
2. Each environment should list:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
   - `VITE_API_BASE_URL`
3. **Settings** → **Secrets and variables** → **Actions** should have **no** app-config secrets
   (delete any that were added before the split into two environments)

## Local Development Setup

For local development, create a `.env` file in the project root:

1. Copy the `.env.example` file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your actual values:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyC1x2y3z4...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abc123...
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   VITE_API_BASE_URL=https://dev-api.perfect-toss.com
   ```

3. **Important**: Never commit the `.env` file to Git! It's already in `.gitignore`.

## Environment-Specific Configuration

### Development vs Production

You can use different values for different environments:

**Local Development (`.env`):**
```env
VITE_API_BASE_URL=https://dev-api.perfect-toss.com
```

**Production (GitHub Secrets):**
```env
VITE_API_BASE_URL=https://api.perfect-toss.com
```

### Multiple Environments

If you want separate staging and production deployments:

1. Create separate GitHub environments in **Settings** → **Environments**
2. Add environment-specific secrets to each environment
3. Update the workflow to deploy to different Azure resources based on the branch

## Troubleshooting

### Build Fails with "undefined" in Config

**Problem**: Variables show as `undefined` in the built application.

**Solutions**:
- Ensure all secrets are named correctly in GitHub (including `VITE_` prefix)
- Verify the workflow file references the secrets correctly: `${{ secrets.SECRET_NAME }}`
- Make sure you've added all required secrets

### Firebase Auth Not Working

**Problem**: Authentication fails after deployment.

**Solutions**:
- Verify Firebase API Key is correct
- Add your Azure deployment URL to Firebase authorized domains:
  1. Go to Firebase Console → Authentication → Settings → Authorized domains
  2. Add your Azure Static Web App URL (e.g., `your-app.azurestaticapps.net`)
  3. Add any custom domains you've configured

### API Calls Failing

**Problem**: API requests return CORS or 404 errors.

**Solutions**:
- Verify `VITE_API_BASE_URL` is correct
- Check that your API allows requests from your Azure deployment URL
- Ensure the API URL doesn't have a trailing slash

### Secrets Not Updating

**Problem**: Changed a secret but the app still uses the old value.

**Solutions**:
- After updating secrets, trigger a new deployment:
  - Push a new commit, or
  - Go to Actions → Select workflow → Run workflow
- Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Security Best Practices

1. ✅ **Never commit** `.env` files to version control
2. ✅ **Use GitHub Secrets** for all sensitive values
3. ✅ **Rotate secrets regularly** (every 90 days recommended)
4. ✅ **Limit Firebase API key** to specific domains in Firebase Console
5. ✅ **Review Firebase Security Rules** to protect your data
6. ✅ **Use environment-specific** Firebase projects (dev, staging, prod)
7. ✅ **Enable 2FA** on your GitHub, Firebase, and Azure accounts
8. ❌ **Don't share** secrets via email, Slack, or other messaging

## Additional Resources

- [GitHub Encrypted Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/learn-more#security-rules)
- [Azure Static Web Apps Configuration](https://docs.microsoft.com/en-us/azure/static-web-apps/configuration)

## Quick Checklist

Before your first deployment, ensure:

- [ ] Production Azure Static Web App is created
- [ ] Development Azure Static Web App is created
- [ ] `production` environment exists with `AZURE_STATIC_WEB_APPS_API_TOKEN` = production token
- [ ] `development` environment exists with `AZURE_STATIC_WEB_APPS_API_TOKEN` = development token
- [ ] All 7 Firebase configuration secrets are added to GitHub Secrets
- [ ] `VITE_API_BASE_URL` is added to GitHub Secrets
- [ ] Both Azure deployment URLs are added to Firebase authorized domains
- [ ] API backend allows CORS requests from both Azure deployment URLs
- [ ] Workflow files are committed: `.github/workflows/ci.yml`, `.github/workflows/deploy-development.yml`, `.github/workflows/deploy-production.yml`
- [ ] Push to `main` deploys to production, push to `dev` deploys to development

Once complete, your application will automatically build and deploy to Azure! 🚀
