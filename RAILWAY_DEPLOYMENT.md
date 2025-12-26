# دليل نشر الباكند على Railway

هذا الدليل يشرح كيفية نشر الباكند على منصة Railway.

## المتطلبات الأساسية

1. حساب على [Railway](https://railway.app)
2. حساب على MongoDB Atlas (أو استخدام MongoDB من Railway)
3. حساب Cloudinary (لرفع الصور)
4. Google Maps API Key (اختياري)

## خطوات النشر

### 1. إعداد المشروع على GitHub

تأكد من أن المشروع موجود على GitHub وأن جميع الملفات محدثة:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. إنشاء مشروع جديد على Railway

1. اذهب إلى [Railway Dashboard](https://railway.app/dashboard)
2. اضغط على "New Project"
3. اختر "Deploy from GitHub repo"
4. اختر المستودع الخاص بك
5. **مهم:** اترك Root Directory فارغاً (سيستخدم الجذر الرئيسي) - الملفات في الجذر ستوجه Railway إلى مجلد `backend` تلقائياً

### 3. إضافة متغيرات البيئة (Environment Variables)

في صفحة المشروع على Railway، اذهب إلى "Variables" وأضف المتغيرات التالية:

#### متغيرات مطلوبة:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/munqeth?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### متغيرات اختيارية:

```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

**ملاحظة:** Railway يقوم تلقائياً بتعيين متغير `PORT`، لا حاجة لإضافته يدوياً.

### 4. إعداد MongoDB

#### خيار 1: استخدام MongoDB Atlas (موصى به)

1. اذهب إلى [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. أنشئ قاعدة بيانات جديدة
3. احصل على Connection String
4. أضف `MONGODB_URI` في Railway Variables

#### خيار 2: استخدام MongoDB من Railway

1. في Railway Dashboard، اضغط "New" → "Database" → "Add MongoDB"
2. Railway سيقوم تلقائياً بإضافة متغير `MONGO_URL`
3. استخدم هذا المتغير كـ `MONGODB_URI`

### 5. إعداد Cloudinary

1. اذهب إلى [Cloudinary](https://cloudinary.com)
2. أنشئ حساب جديد أو سجل الدخول
3. من Dashboard، احصل على:
   - Cloud Name
   - API Key
   - API Secret
4. أضفها في Railway Variables

### 6. النشر

بعد إضافة جميع المتغيرات:

1. Railway سيقوم تلقائياً ببناء وتشغيل المشروع
2. انتظر حتى يكتمل البناء (Build)
3. بعد النشر الناجح، ستحصل على رابط مثل: `https://your-app-name.up.railway.app`

### 7. التحقق من النشر

افتح الرابط التالي في المتصفح للتحقق من أن السيرفر يعمل:

```
https://your-app-name.up.railway.app/api/health
```

يجب أن ترى رسالة:
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

## تحديث رابط API في التطبيق

بعد الحصول على رابط Railway، قم بتحديث رابط API في التطبيق:

1. افتح ملف `lib/utils/constants.dart`
2. غيّر `baseUrl` إلى رابط Railway:

```dart
static const String baseUrl = 'https://your-app-name.up.railway.app/api';
```

## نصائح مهمة

### الأمان

- **لا تضع** معلومات حساسة في الكود
- استخدم دائماً Environment Variables
- تأكد من أن `.env` موجود في `.gitignore`

### الأداء

- Railway يوفر SSL تلقائياً
- يمكنك إضافة Custom Domain من إعدادات المشروع
- Railway يوفر Logs في الوقت الفعلي

### المراقبة

- استخدم Railway Dashboard لمراقبة:
  - Logs
  - Metrics (CPU, Memory, Network)
  - Deployments

### تحديثات الكود

- عند عمل `git push`، Railway سيقوم تلقائياً بإعادة النشر
- يمكنك تعطيل Auto-Deploy من Settings

## استكشاف الأخطاء

### المشكلة: السيرفر لا يعمل

1. تحقق من Logs في Railway Dashboard
2. تأكد من أن جميع Environment Variables موجودة
3. تحقق من أن MongoDB URI صحيح

### المشكلة: خطأ في الاتصال بقاعدة البيانات

1. تأكد من أن MongoDB Atlas يسمح بالاتصال من أي IP (0.0.0.0/0)
2. تحقق من أن كلمة المرور صحيحة
3. تأكد من أن Database Name صحيح

### المشكلة: خطأ في رفع الصور

1. تحقق من Cloudinary credentials
2. تأكد من أن API Key و Secret صحيحين

## الدعم

إذا واجهت أي مشاكل:
1. راجع Logs في Railway Dashboard
2. تحقق من [Railway Documentation](https://docs.railway.app)
3. راجع ملف `server.js` للتأكد من الإعدادات

---

**تم النشر بنجاح! 🎉**

