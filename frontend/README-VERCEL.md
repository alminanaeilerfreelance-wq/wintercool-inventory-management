# Vercel + Render Setup Complete

## Files Added/Updated:
- `vercel.json`: Proxies `/api/*` → Render backend
- `next.config.js`: Standalone build, rewrites, env, images
- **Manual**: Add to `.env.production` (or Vercel dashboard):
  ```
  NEXT_PUBLIC_API_URL=https://wintercool-k2o8.onrender.com/api
  ```

## Deploy Commands:
```bash
cd frontend
vercel login  # if not logged in
vercel env add NEXT_PUBLIC_API_URL production  # set env
vercel --prod  # deploy
```

## Test:
1. Visit Vercel URL (e.g. your-app.vercel.app)
2. Login → Dashboard loads data from Render
3. Check Network tab: `/api/*` → 200 from Render

## Backend CORS (if issues):
Add to `backend/server.js` CORS origins:
```
'https://your-vercel-app.vercel.app'
```

Vercel now connects to Render! 🚀
