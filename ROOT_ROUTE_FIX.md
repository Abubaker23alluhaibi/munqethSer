# حل مشكلة "Cannot GET /" في Railway

## المشكلة
عند فتح الرابط `monqeth-production.up.railway.app` يظهر خطأ "Cannot GET /" بينما باقي الـ endpoints (مثل `/api/health`) تعمل بشكل طبيعي.

## السبب
تم نقل الـ root route (`/`) إلى مكان أبكر في الكود لضمان أن Express يجدها قبل أي routes أخرى.

## الحل

### 1. تحديث الكود على GitHub

تأكد من رفع الكود المحدث:

```bash
cd backend
git add .
git commit -m "Fix root route - move before API routes"
git push origin main
```

### 2. التحقق من إعدادات Railway

في Railway Dashboard:

1. تأكد من أن **Root Directory** مضبوط على `backend` (إذا كان المشروع في مجلد backend)
2. تأكد من أن **Build Command** هو `npm install`
3. تأكد من أن **Start Command** هو `npm start`

### 3. إعادة النشر

بعد رفع الكود على GitHub:

1. Railway سيقوم تلقائياً بإعادة البناء (Auto-Deploy)
2. إذا لم يحدث ذلك، اذهب إلى Railway Dashboard → Deployments → اضغط "Redeploy"

### 4. التحقق من النشر

بعد إعادة النشر، اختبر الـ endpoints التالية:

- ✅ `https://monqeth-production.up.railway.app/` - يجب أن يعرض رسالة ترحيبية
- ✅ `https://monqeth-production.up.railway.app/api/health` - يجب أن يعرض `{"status":"OK","message":"Server is running"}`
- ✅ `https://monqeth-production.up.railway.app/api` - يجب أن يعرض معلومات API

### 5. التحقق من Logs

إذا كانت المشكلة مستمرة:

1. اذهب إلى Railway Dashboard → Logs
2. ابحث عن أخطاء في الـ startup
3. تأكد من أن MongoDB متصل
4. تأكد من أن جميع Environment Variables موجودة

## التغييرات التي تمت

1. ✅ نقل `app.get('/')` إلى قبل الـ API routes
2. ✅ إضافة 404 Handler للتعامل مع routes غير الموجودة
3. ✅ إضافة Error Handler للتعامل مع الأخطاء

## ملاحظات مهمة

- **Root Directory في Railway**: إذا كنت تستخدم repository منفصل للـ backend، اترك Root Directory فارغاً. إذا كان الـ backend في مجلد `backend` داخل repository مشترك، ضع `backend` كـ Root Directory.
- **Environment Variables**: تأكد من وجود جميع المتغيرات المطلوبة في Railway Variables
- **MongoDB Connection**: تأكد من أن MongoDB URI صحيح وأن قاعدة البيانات تسمح بالاتصال

## رابط التطبيق

بعد التأكد من أن كل شيء يعمل:

1. افتح `lib/utils/constants.dart` في التطبيق
2. حدّث `baseUrl` إلى:
   ```dart
   static const String baseUrl = 'https://monqeth-production.up.railway.app/api';
   ```

---

**إذا استمرت المشكلة بعد تطبيق هذه الخطوات، تحقق من Logs في Railway Dashboard للحصول على تفاصيل أكثر.**

