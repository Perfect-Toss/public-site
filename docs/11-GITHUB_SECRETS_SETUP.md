# GitHub Secrets Setup Guide

This guide will help you configure all the necessary secrets in your GitHub repository for automated deployment to Azure.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository. Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

### 1. Azure Deployment Token

| Secret Name | Description | How to Get It |
|------------|-------------|---------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token for Azure Static Web Apps | See [Azure Setup Guide](10-AZURE_DEPLOYMENT.md) |

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
| `VITE_API_BASE_URL` | `https://api.perfect-toss.com` | Your backend API URL (production) |

## Step-by-Step Instructions

### Adding Secrets to GitHub

1. Navigate to your repository on GitHub
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click the **New repository secret** button
5. For each secret listed above:
   - Enter the **Name** (exactly as shown, including the `VITE_` prefix)
   - Enter the **Value** (paste the actual value from Firebase or Azure)
   - Click **Add secret**

### Example: Adding Firebase API Key

```
Name: VITE_FIREBASE_API_KEY
Value: AIzaSyC1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m
```

Click **Add secret**

### Verifying Secrets

After adding all secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see all the secrets listed (values are hidden for security)
3. The list should include:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
   - `VITE_API_BASE_URL`

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

- [ ] Azure Static Web App is created
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` is added to GitHub Secrets
- [ ] All 7 Firebase configuration secrets are added to GitHub Secrets
- [ ] `VITE_API_BASE_URL` is added to GitHub Secrets
- [ ] Azure deployment URL is added to Firebase authorized domains
- [ ] API backend allows CORS requests from Azure deployment URL
- [ ] Workflow file is committed to `.github/workflows/azure-deploy.yml`
- [ ] Push to `main` branch triggers the deployment

Once complete, your application will automatically build and deploy to Azure! 🚀
