# 📚 Vocab — Smart Word Learning App

Look up English words, hear pronunciation, save to collection, get daily review.

## Features

- 🔍 Word Lookup (Free Dictionary API)
- 🔊 Pronunciation (IPA + MP3 + browser TTS)
- 📦 Personal Collection
- 🎯 Spaced Repetition Review
- 🔐 Google Sign-In

## Setup

```bash
npm install
npx prisma migrate dev
```

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client ID (Web)
2. Redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Fill `.env`: `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`

```bash
npm run dev  # → http://localhost:3000
```

## Deploy to Vercel

1. Push to GitHub → Import in Vercel
2. Add **Vercel Postgres** (Storage tab) or any PostgreSQL
3. Set Environment Variables:
   ```
   DATABASE_URL          # Auto-filled by Vercel Postgres
   AUTH_SECRET           # openssl rand -base64 32
   AUTH_GOOGLE_ID        # Your Google OAuth Client ID
   AUTH_GOOGLE_SECRET    # Your Google OAuth Client Secret
   AUTH_URL              # https://your-app.vercel.app
   ```
4. Add redirect URI in Google Console: `https://your-app.vercel.app/api/auth/callback/google`
5. Update `prisma/schema.prisma` to `provider = "postgresql"` and deploy migration

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/lookup?word=xxx` | GET | Dictionary lookup |
| `/api/words` | GET/POST/DELETE | Collection CRUD |
| `/api/review?count=3` | GET | Daily review words |
