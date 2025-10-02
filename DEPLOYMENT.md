# PieTracker Deployment Guide

## Quick Deployment Summary

### 1. Backend Deployment (Render)
- Platform: [Render.com](https://render.com)
- Repository: Connect to your GitHub repo
- Service Type: Web Service
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health Check: `/health`

### 2. Frontend Deployment (Vercel)
- Platform: [Vercel.com](https://vercel.com)
- Repository: Connect to your GitHub repo
- Root Directory: `frontend`
- Build Command: `npm run build` (automatically detected)
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: Your backend URL from Render

## Step-by-Step Instructions

### Backend on Render

1. **Sign up for Render** at [render.com](https://render.com)
2. **Connect GitHub**: Link your GitHub account
3. **Create Web Service**:
   - Click "New" → "Web Service"
   - Select your PieTracker repository
   - Choose "backend" as root directory
4. **Configure Service**:
   - Name: `pietracker-backend` (or your choice)
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Deploy**: Click "Create Web Service"
6. **Note your URL**: Save the generated URL (e.g., `https://pietracker-backend.onrender.com`)

### Frontend on Vercel

1. **Sign up for Vercel** at [vercel.com](https://vercel.com)
2. **Import Project**:
   - Click "New Project"
   - Import your PieTracker repository
3. **Configure Project**:
   - Root Directory: `frontend`
   - Framework Preset: Vite (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables**:
   - Add variable: `VITE_API_URL`
   - Value: Your backend URL from Render (e.g., `https://pietracker-backend.onrender.com`)
5. **Deploy**: Click "Deploy"
6. **Your app is live!**: Get your URL (e.g., `https://pietracker.vercel.app`)

## Post-Deployment

### Update CORS (If needed)
If your frontend URL is different from the defaults, update `backend/main.py`:

```python
allow_origins=[
    # ... existing origins ...
    "https://your-actual-frontend-url.vercel.app",
],
```

### Custom Domain (Optional)
Both Render and Vercel support custom domains:
- **Render**: Dashboard → Settings → Custom Domains
- **Vercel**: Project Settings → Domains

### Monitoring
- **Backend Health**: Visit `https://your-backend-url.onrender.com/health`
- **API Docs**: Visit `https://your-backend-url.onrender.com/docs`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your frontend URL is in the backend's CORS origins
2. **Environment Variables**: Ensure `VITE_API_URL` is set correctly on Vercel
3. **Build Failures**: Check that all dependencies are properly listed
4. **Free Tier Limitations**: Render free tier may spin down after inactivity

### Logs and Debugging
- **Render**: Dashboard → Service → Logs
- **Vercel**: Dashboard → Project → Functions/Deployments

## Free Tier Limits

### Render (Backend)
- ✅ 750 hours/month (enough for 24/7)
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ Cold start delays (10-15 seconds)

### Vercel (Frontend)
- ✅ Unlimited static hosting
- ✅ 100GB bandwidth/month
- ✅ Instant cold starts

## Upgrading for Production

For production use, consider:
- **Database**: Replace JSON files with PostgreSQL/MongoDB
- **Authentication**: Add user accounts and authentication
- **Monitoring**: Set up error tracking and analytics
- **CDN**: Use Vercel's Edge Network or Cloudflare
- **Backup**: Implement data backup strategies

---

Your PieTracker app is now ready for the world! 🎉