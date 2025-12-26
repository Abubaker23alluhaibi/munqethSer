# دليل سريع للنشر على Railway

## خطوات سريعة (5 دقائق)

### 1. ارفع الكود على GitHub
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. أنشئ مشروع على Railway
1. اذهب إلى https://railway.app
2. اضغط "New Project" → "Deploy from GitHub repo"
3. اختر المستودع واختر مجلد `backend` كـ Root Directory

### 3. أضف المتغيرات البيئية
في Railway Dashboard → Variables، أضف:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/munqeth?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 4. انتظر النشر
Railway سيقوم تلقائياً ببناء وتشغيل المشروع.

### 5. احصل على الرابط
بعد النشر، ستحصل على رابط مثل:
`https://your-app-name.up.railway.app`

### 6. اختبر السيرفر
افتح: `https://your-app-name.up.railway.app/api/health`

---

**للمزيد من التفاصيل، راجع ملف `RAILWAY_DEPLOYMENT.md`**

