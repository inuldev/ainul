# 🚀 Panduan Deploy ke Vercel (GRATIS)

## 📋 Persiapan

### 1. Akun yang Diperlukan

- [Vercel Account](https://vercel.com) (gratis, tanpa kartu kredit)
- [MongoDB Atlas](https://cloud.mongodb.com) (gratis)
- [Cloudinary Account](https://cloudinary.com) (gratis)
- [Google AI Studio](https://aistudio.google.com) untuk Gemini API (gratis)

### 2. Push ke GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## 🎯 Deploy Frontend (React)

### 1. Login ke Vercel

- Buka [vercel.com](https://vercel.com)
- Login dengan GitHub

### 2. Import Project

- Klik "New Project"
- Pilih repository `ainul`
- Set **Root Directory** ke `frontend`
- Framework akan terdeteksi otomatis sebagai "Vite"

### 3. Deploy

- Klik "Deploy"
- Tunggu proses selesai
- Catat URL frontend (misal: `https://ainul-frontend.vercel.app`)

## 🔧 Deploy Backend (Express.js)

### 1. Import Project Kedua

- Klik "New Project" lagi
- Pilih repository `ainul` yang sama
- Set **Root Directory** ke `backend`

### 2. Environment Variables

Tambahkan di Vercel Dashboard:

```
NODE_ENV=production
FRONTEND_URL=https://ainul-frontend.vercel.app
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY
```

### 3. Deploy

- Klik "Deploy"
- Catat URL backend (misal: `https://ainul-backend.vercel.app`)

## 🔗 Update Frontend Config

### 1. Update API URL di Frontend

Edit file frontend yang menggunakan axios untuk mengganti localhost dengan URL backend Vercel.

### 2. Redeploy Frontend

- Push perubahan ke GitHub
- Vercel akan auto-deploy

## ✅ Testing

### 1. Test Backend

```
GET https://ainul-backend.vercel.app/health
```

### 2. Test Frontend

Buka URL frontend dan test semua fitur.

## 🎉 Selesai!

Kedua aplikasi sekarang live di Vercel tanpa biaya!

### URLs:

- **Frontend**: https://your-frontend.vercel.app
- **Backend**: https://your-backend.vercel.app

## 🔧 Tips Troubleshooting

### 1. CORS Error

Pastikan `FRONTEND_URL` di backend sesuai dengan URL frontend Vercel.

### 2. Database Connection

Pastikan MongoDB Atlas mengizinkan koneksi dari semua IP (0.0.0.0/0).

### 3. Environment Variables

Double-check semua env vars di Vercel dashboard.

### 4. Logs

Check logs di Vercel dashboard untuk debug errors.
