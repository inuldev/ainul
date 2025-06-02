# 🎨 Ainul - Asisten Virtual AI yang Optimal & Dapat Diandalkan

## 🚀 Tentang Proyek

**Ainul** adalah Asisten Virtual AI berbasis MERN STACK yang telah dioptimasi untuk performa dan keandalan maksimal 🔥

### 📚 Sumber Pembelajaran

Proyek ini dikembangkan berdasarkan tutorial dari **Virtual Code** dan telah ditingkatkan dengan berbagai optimasi enterprise-level.

> 📺 **[Build your own AI Virtual Assistant With MERN STACK](https://www.youtube.com/watch?v=7_JwpPLyRbw)** > _oleh [VIRTUAL CODE](https://www.youtube.com/@virtual_code)_

### ✨ Fitur Utama

#### 🎯 **Fitur Inti**

- **Speech Recognition** dengan debouncing dan error handling yang robust
- **AI Processing** menggunakan Gemini AI dengan retry mechanism
- **Voice Synthesis** dengan fallback dan konfigurasi optimal
- **Real-time Status** monitoring (online/offline, listening, processing)
- **Command History** dengan timestamp dan pagination
- **Custom Assistant** dengan nama dan gambar yang dapat disesuaikan

#### 🛡️ **Optimasi Keamanan & Performa**

- **Rate Limiting** untuk mencegah spam dan abuse
- **Enhanced Error Handling** dengan structured logging
- **Retry Mechanism** untuk API calls yang gagal
- **Fallback Responses** ketika AI tidak tersedia
- **Input Validation** yang komprehensif
- **Request/Response Logging** untuk monitoring

#### 🔧 **Fitur Teknis Lanjutan**

- **Multiple JSON Parsing Strategies** untuk respons AI yang konsisten
- **Network Status Monitoring** dengan auto-reconnect
- **Graceful Degradation** saat offline
- **Enhanced Weather Integration** (siap untuk API real)
- **Confidence-based Speech Recognition**
- **Progressive Retry Delays** untuk optimasi performa

### 🛠️ Teknologi & Optimasi

**Frontend:** React | Vite | TailwindCSS | Web Speech API | Axios
**Backend:** Node.js | Express | MongoDB | Mongoose | JWT | bcryptjs
**AI & Cloud:** Gemini AI | Cloudinary | Multer
**Monitoring:** Custom Logger | Rate Limiter | Error Tracking
**Security:** CORS | Input Validation | Environment Variables

## 🚀 Instalasi & Setup

### Prerequisites

- Node.js (v16 atau lebih baru)
- MongoDB (lokal atau cloud)
- Gemini AI API Key
- Cloudinary Account

### 1. Clone Repository

```bash
git clone https://github.com/inuldev/ainul.git
cd ainul
```

### 2. Setup Backend

```bash
cd backend
npm install

# Copy dan edit environment variables
cp .env.example .env
# Edit .env dengan konfigurasi Anda
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

### 4. Konfigurasi Environment Variables

Edit file `backend/.env`:

```env
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=INFO

MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY
```

### 5. Jalankan Aplikasi

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

Aplikasi akan berjalan di:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## 📱 Cara Penggunaan

### 1. **Registrasi & Login**

- Buat akun baru atau login dengan akun existing
- Sistem menggunakan JWT untuk autentikasi yang aman

### 2. **Setup Assistant**

- Pilih nama untuk asisten virtual Anda
- Upload gambar custom atau pilih dari preset
- Kustomisasi sesuai preferensi

### 3. **Menggunakan Voice Commands**

- Izinkan akses mikrofon saat diminta
- Katakan nama asisten Anda diikuti perintah
- Contoh: "Ainul, jam berapa sekarang?"

### 4. **Perintah Manual**

- Gunakan input text untuk testing
- Klik tombol quick action untuk perintah cepat
- Lihat history perintah di sidebar

## 🎯 Perintah yang Didukung

### 📅 **Informasi Waktu**

- "jam berapa sekarang?" → Menampilkan waktu saat ini
- "tanggal hari ini?" → Menampilkan tanggal
- "hari apa sekarang?" → Menampilkan hari
- "bulan apa sekarang?" → Menampilkan bulan

### 🔍 **Pencarian**

- "cari [query] di Google" → Membuka pencarian Google
- "cari video [query]" → Mencari di YouTube
- "putar [lagu/video]" → Memutar di YouTube

### 🌤️ **Informasi Cuaca**

- "cuaca hari ini" → Menampilkan informasi cuaca

### 🔧 **Aplikasi**

- "buka kalkulator" → Membuka kalkulator
- "buka Instagram" → Membuka Instagram
- "buka Facebook" → Membuka Facebook

### 💬 **Percakapan Umum**

- Tanya jawab umum dengan AI
- Obrolan santai dengan asisten

## 🛡️ Fitur Keamanan & Monitoring

### Rate Limiting

- **Auth endpoints:** 5 requests per 15 menit
- **Assistant commands:** 20 requests per menit
- **General endpoints:** 100 requests per menit

### Logging System

- Request/response logging
- Error tracking dengan stack trace
- Gemini API call monitoring
- Assistant command analytics

### Error Handling

- Graceful degradation saat offline
- Automatic retry untuk failed requests
- Fallback responses saat AI tidak tersedia
- Comprehensive input validation

## 📊 Monitoring & Logs

Aplikasi menghasilkan log files di `backend/logs/`:

- `combined.log` - Semua log aktivitas
- `error.log` - Log khusus error
- `debug.log` - Log debugging (development)

## 🔧 Troubleshooting

### Speech Recognition Tidak Bekerja

- Pastikan browser mendukung Web Speech API
- Izinkan akses mikrofon
- Gunakan HTTPS untuk production

### Gemini AI Error

- Periksa API key di environment variables
- Cek quota dan billing Gemini AI
- Lihat log untuk detail error

### Database Connection Error

- Pastikan MongoDB berjalan
- Periksa connection string di .env
- Cek network connectivity

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 Lisensi

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- [Virtual Code](https://www.youtube.com/@virtual_code) untuk tutorial dasar
- [Gemini AI](https://ai.google.dev/) untuk AI processing
- [Cloudinary](https://cloudinary.com/) untuk image management
- [MongoDB](https://www.mongodb.com/) untuk database
- [React](https://reactjs.org/) untuk frontend framework
