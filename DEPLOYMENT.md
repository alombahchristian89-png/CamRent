# CAMRENT Deployment Guide

## Architecture
- Frontend: Vercel (project root set to `client`)
- Backend API + WebSocket: Render (project root set to `server`)

## 1) Backend on Render

Use `render.yaml` in repository root, or configure manually with:
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

Required Render environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for backend)
- `MONGODB_URI` (if legacy Mongo utilities are still used)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`
- `SUPABASE_DB_URL` (if DB scripts are used)

After deploy, copy your Render backend URL, e.g.:
- `https://camrent-backend.onrender.com`

## 2) Frontend on Vercel

Create/import a Vercel project pointing to this repository.
Set the Vercel Root Directory to `client`.

Frontend environment variables:
- `VITE_API_BASE_URL=https://camrent-backend.onrender.com/api`
- `VITE_WS_NOTIFICATIONS_URL=wss://camrent-backend.onrender.com/ws/notifications`
- `VITE_SUPABASE_URL=https://your-project-ref.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`

`client/vercel.json` includes SPA rewrite to `index.html`.

## 3) CORS and Domains

Current backend CORS is permissive (`cors()`), so cross-origin calls from Vercel to Render will work.
For stricter production security, restrict origins to your Vercel domain and custom domain.

## 4) Verification Checklist

- Backend health endpoint returns 200: `GET /api/health`
- Frontend login/register flows work against Render URL
- Admin notification WebSocket connects successfully
- File uploads (Cloudinary) work in production
- Supabase queries succeed from backend and frontend
