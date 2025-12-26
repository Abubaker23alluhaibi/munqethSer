# قالب المتغيرات البيئية

انسخ هذه المتغيرات وأضفها في Railway Dashboard → Variables

## متغيرات مطلوبة

```env
# MongoDB Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/munqeth?retryWrites=true&w=majority

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## متغيرات اختيارية

```env
# Google Maps API (for directions and geocoding)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Firebase Admin SDK (for push notifications)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

## ملاحظات

- **PORT**: Railway يقوم تلقائياً بتعيين هذا المتغير، لا حاجة لإضافته
- **MONGODB_URI**: يمكنك استخدام MongoDB Atlas أو MongoDB من Railway
- **CLOUDINARY**: مطلوب لرفع الصور والملفات
- **GOOGLE_MAPS_API_KEY**: اختياري، مطلوب فقط إذا كنت تستخدم ميزات الخرائط
- **FIREBASE**: اختياري، مطلوب فقط إذا كنت تستخدم Firebase للـ Push Notifications

