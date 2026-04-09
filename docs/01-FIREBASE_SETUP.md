# Perfect Toss - Firebase Setup Guide

## 🔥 Firebase Configuration

### Step 1: Get Your Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your "Perfect Toss" project
3. Click on the gear icon ⚙️ next to "Project Overview"
4. Go to "Project Settings"
5. Scroll down to "Your apps" section
6. Click on the web app icon `</>` or select your existing web app
7. Copy the `firebaseConfig` object values

### Step 2: Create Environment File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace the values with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=perfect-toss.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=perfect-toss
   VITE_FIREBASE_STORAGE_BUCKET=perfect-toss.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

3. **Important**: `.env` is already in `.gitignore` - never commit this file!

### Step 3: Enable Authentication Methods

#### Google Sign-In
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Google** provider
3. Toggle "Enable"
4. Add your support email
5. Click "Save"

#### Apple Sign-In
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Apple** provider
3. Toggle "Enable"
4. You'll need to configure Apple Developer account settings
5. Follow [Firebase's Apple Sign-In guide](https://firebase.google.com/docs/auth/web/apple)

#### Email/Password (Optional)
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Email/Password** provider
3. Toggle "Enable"
4. Click "Save"

### Step 4: Configure Authorized Domains

1. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Make sure `localhost` is in the list (it should be by default)
3. When deploying, add your production domain

### Step 5: Restart Development Server

After setting up your `.env` file:

```bash
npm run dev
```

## 🚀 Available Authentication Methods

- ✅ Google Sign-In (OAuth)
- ✅ Apple Sign-In (OAuth)
- 📧 Email/Password (ready to implement)
- 🔗 Email Link (ready to implement)

## 📁 Project Structure

```
src/
├── components/
│   ├── Login.jsx          # Login page component
│   └── Login.css          # Login styles
├── contexts/
│   ├── AuthContext.jsx    # Auth state provider
│   └── useAuth.js         # Auth hook
├── firebase/
│   ├── config.js          # Firebase initialization
│   └── auth.js            # Auth helper functions
└── App.jsx                # Main app component
```

## 🔐 Security Notes

- Never commit your `.env` file
- Keep your Firebase API keys secure
- Configure Firebase Security Rules for production
- Enable Firebase App Check for additional security

## 📝 Next Steps

1. Test Google and Apple sign-in
2. Implement email/password authentication
3. Add user profile management
4. Set up protected routes
5. Add Firestore for data storage

## 🐛 Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Make sure your domain is added to Authorized domains in Firebase Console

### "Firebase: Error (auth/configuration-not-found)"
- Check that you've enabled the authentication provider in Firebase Console

### Environment variables not loading
- Make sure your `.env` file is in the root directory
- Variable names must start with `VITE_`
- Restart the dev server after changing `.env`

## 📚 Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
