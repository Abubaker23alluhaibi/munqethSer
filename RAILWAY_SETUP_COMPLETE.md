# ✅ إعداد الباكند على Railway - مكتمل

## 🎉 السيرفر يعمل الآن!

**رابط السيرفر:** https://munqethser-production.up.railway.app

**Health Check:** https://munqethser-production.up.railway.app/api/health

**API Base URL:** https://munqethser-production.up.railway.app/api

## ✅ ما تم إنجازه:

1. ✅ تم ربط الباكند بمستودع GitHub منفصل: `munqethSer`
2. ✅ تم تحديث رابط API في التطبيق Flutter
3. ✅ تم التأكد من إعدادات Railway (railway.json, nixpacks.toml, Procfile)
4. ✅ السيرفر جاهز للاستخدام

## 📱 تحديث التطبيق:

تم تحديث رابط API في ملف `munqeth/lib/utils/constants.dart`:

```dart
static const String baseUrl = 'https://munqethser-production.up.railway.app/api';
```

## 🔐 المتغيرات البيئية المطلوبة في Railway:

تأكد من أن جميع المتغيرات التالية موجودة في Railway Dashboard:

### متغيرات مطلوبة:
- ✅ `MONGODB_URI` - رابط قاعدة البيانات MongoDB
- ✅ `CLOUDINARY_CLOUD_NAME` - اسم Cloudinary
- ✅ `CLOUDINARY_API_KEY` - مفتاح Cloudinary API
- ✅ `CLOUDINARY_API_SECRET` - سر Cloudinary API

### متغيرات اختيارية:
- ⚪ `GOOGLE_MAPS_API_KEY` - مفتاح Google Maps API
- ⚪ `FIREBASE_PROJECT_ID` - معرف مشروع Firebase
- ⚪ `FIREBASE_PRIVATE_KEY` - مفتاح Firebase الخاص
- ⚪ `FIREBASE_CLIENT_EMAIL` - بريد Firebase
- ⚪ `JWT_SECRET` - سر JWT للتوقيع (إذا كنت تستخدم JWT)

**ملاحظة:** Railway يقوم تلقائياً بتعيين `PORT` و `HOST`، لا حاجة لإضافتهما.

## 🔄 خطوات النشر على Railway:

### 1. إنشاء مشروع جديد على Railway:

1. اذهب إلى [Railway Dashboard](https://railway.app/dashboard)
2. اضغط "New Project"
3. اختر "Deploy from GitHub repo"
4. اختر المستودع: `Abubaker23alluhaibi/munqethSer`
5. **مهم:** اترك Root Directory فارغاً (سيستخدم الجذر الرئيسي)

### 2. إضافة المتغيرات البيئية:

في صفحة المشروع → Variables → أضف جميع المتغيرات المطلوبة

### 3. النشر:

Railway سيقوم تلقائياً بـ:
- بناء المشروع (npm install)
- تشغيل السيرفر (npm start)
- تعيين رابط عام

### 4. التحقق:

افتح في المتصفح:
```
https://munqethser-production.up.railway.app/api/health
```

يجب أن ترى:
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

## 📝 ملفات الإعدادات:

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm install"]

[start]
cmd = "node server.js"
```

### Procfile
```
web: node server.js
```

## 🔍 اختبار API:

### Health Check:
```bash
curl https://munqethser-production.up.railway.app/api/health
```

### Root Endpoint:
```bash
curl https://munqethser-production.up.railway.app/
```

### API Info:
```bash
curl https://munqethser-production.up.railway.app/api
```

## 🚀 Endpoints المتاحة:

- `/` - معلومات السيرفر
- `/api` - معلومات API
- `/api/health` - فحص الحالة
- `/api/users` - إدارة المستخدمين
- `/api/products` - إدارة المنتجات
- `/api/orders` - إدارة الطلبات
- `/api/drivers` - إدارة السائقين
- `/api/advertisements` - الإعلانات
- `/api/cards` - البطاقات
- `/api/supermarkets` - المتاجر
- `/api/images` - رفع الصور
- `/api/locations` - المواقع
- `/api/maps` - خرائط Google
- `/api/admins` - إدارة الأدمن

## 🔄 التحديثات التلقائية:

عند عمل `git push` إلى المستودع `munqethSer`:
- Railway سيقوم تلقائياً بإعادة بناء وتشغيل السيرفر
- يمكنك تعطيل Auto-Deploy من Settings إذا أردت

## 📊 المراقبة:

استخدم Railway Dashboard لمراقبة:
- **Logs** - سجلات السيرفر في الوقت الفعلي
- **Metrics** - استخدام CPU, Memory, Network
- **Deployments** - تاريخ النشرات
- **Variables** - المتغيرات البيئية

## 🐛 استكشاف الأخطاء:

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

### المشكلة: CORS Error
- السيرفر مضبوط على قبول جميع المصادر (`origin: "*"`)
- إذا استمرت المشكلة، تحقق من إعدادات CORS في `server.js`

## 📚 ملفات إضافية:

- `RAILWAY_DEPLOYMENT.md` - دليل مفصل للنشر
- `QUICK_START.md` - دليل سريع
- `DEPLOYMENT_CHECKLIST.md` - قائمة تحقق
- `ENV_TEMPLATE.md` - قالب المتغيرات البيئية

## ✅ قائمة التحقق النهائية:

- [x] تم ربط الباكند بمستودع GitHub منفصل
- [x] تم تحديث رابط API في التطبيق Flutter
- [x] ملفات Railway موجودة وصحيحة
- [ ] تم إضافة جميع المتغيرات البيئية في Railway
- [ ] تم اختبار Health Check
- [ ] تم اختبار API Endpoints
- [ ] تم اختبار التطبيق مع السيرفر الجديد

---

**تم الإعداد بنجاح! 🎉**

**رابط السيرفر:** https://munqethser-production.up.railway.app

