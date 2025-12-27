# 🔍 تشخيص مشكلة FCM Tokens

## المشكلة الحالية
بعد تسجيل الدخول، FCM tokens لا يتم تحديثها في قاعدة البيانات.

## خطوات التشخيص

### 1. التحقق من Logs في السيرفر

بعد تسجيل الدخول، ابحث في logs عن:

#### للمستخدمين:
```
📱 Received FCM token update request for phone: +964...
✅ User found: ...
✅ Updated FCM token for user ...
```

#### للسائقين:
```
📱 Received FCM token update request for driverId: A1
✅ Driver found: ...
✅ Updated FCM token for driver ...
```

**إذا لم ترى هذه الرسائل:**
- التطبيق لا يرسل الطلب إلى السيرفر
- تحقق من logs التطبيق (Flutter logs)

### 2. التحقق من حالة FCM Token في قاعدة البيانات

#### للمستخدمين:
```bash
# استبدل +9647654321000 برقم الهاتف الفعلي
curl http://your-server:3000/api/users/phone/+9647654321000/fcm-token/status
```

#### للسائقين:
```bash
# استبدل A1 بـ driverId الفعلي
curl http://your-server:3000/api/drivers/driverId/A1/fcm-token/status
```

**الاستجابة المتوقعة:**
```json
{
  "phone": "+9647654321000",
  "name": "اسم المستخدم",
  "hasFcmToken": true,
  "fcmTokenPreview": "cXJzZXJ2ZXJ0ZXN0...",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 3. التحقق من Logs التطبيق (Flutter)

افتح logs التطبيق وابحث عن:

```
✅ FCM token sent to server for user: ...
✅ FCM token sent to server for driver: ...
```

أو:

```
❌ Failed to send FCM token for user phone: ...
Error updating FCM token for user phone: ...
```

### 4. التحقق من أن NotificationService مهيأ

في logs التطبيق، ابحث عن:
```
NotificationService initialized successfully
FCM Token obtained successfully: ...
```

**إذا لم ترى هذه الرسائل:**
- NotificationService لم يتم تهيئته
- Firebase لم يتم تهيئته بشكل صحيح
- تحقق من `google-services.json`

### 5. التحقق من Network Requests

افتح Developer Tools في المتصفح أو استخدم proxy مثل Charles/Fiddler:

**المستخدمين:**
```
PUT /api/users/phone/+9647654321000/fcm-token
Body: { "fcmToken": "..." }
```

**السائقين:**
```
PUT /api/drivers/driverId/A1/fcm-token
Body: { "fcmToken": "..." }
```

## الحلول المحتملة

### الحل 1: إعادة تهيئة NotificationService

في التطبيق، تأكد من أن `NotificationService` يتم تهيئته في `main.dart`:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // تهيئة NotificationService
  final notificationService = NotificationService();
  await notificationService.initialize();
  
  runApp(MyApp());
}
```

### الحل 2: إرسال FCM Token يدوياً

أضف زر في التطبيق لإرسال FCM token يدوياً:

```dart
Future<void> sendFcmTokenManually() async {
  final notificationService = NotificationService();
  if (!notificationService.isInitialized) {
    await notificationService.initialize();
  }
  
  final fcmToken = notificationService.fcmToken;
  if (fcmToken != null) {
    // إرسال token للمستخدم
    await userService.updateFcmTokenByPhone(phone, fcmToken);
    
    // أو للسائق
    await driverService.updateFcmTokenByDriverId(driverId, fcmToken);
  }
}
```

### الحل 3: زيادة وقت الانتظار

في `auth_provider.dart`، زد وقت الانتظار قبل إرسال FCM token:

```dart
Future.delayed(const Duration(seconds: 5), () async { // بدلاً من 2
  // ...
});
```

### الحل 4: إرسال FCM Token عند فتح التطبيق

أضف في `loadSavedAuth` إرسال FCM token تلقائياً:

```dart
Future<void> loadSavedAuth() async {
  // ... الكود الحالي ...
  
  // إرسال FCM token بعد تحميل الحالة
  Future.delayed(const Duration(seconds: 3), () {
    if (_currentUser != null) {
      final phone = await SecureStorageService.getString('user_phone');
      _sendFcmTokenToServer(userId: _currentUser!.id, phone: phone);
    }
    if (_driver != null) {
      _sendFcmTokenToServer(driverId: _driver!.driverId);
    }
  });
}
```

## التحقق من قاعدة البيانات مباشرة

### MongoDB Shell:

```javascript
// البحث عن مستخدم
db.users.find({ 
  $or: [
    { phone: "+9647654321000" },
    { phone: "07654321000" },
    { phone: "9647654321000" }
  ]
}, { name: 1, phone: 1, fcmToken: 1 });

// البحث عن سائق
db.drivers.find({ driverId: "A1" }, { name: 1, driverId: 1, fcmToken: 1 });

// عدد المستخدمين مع tokens
db.users.countDocuments({ 
  fcmToken: { $exists: true, $ne: null, $ne: "" } 
});

// عدد السائقين مع tokens
db.drivers.countDocuments({ 
  fcmToken: { $exists: true, $ne: null, $ne: "" } 
});
```

## ملخص المشاكل الشائعة

| المشكلة | السبب المحتمل | الحل |
|---------|---------------|------|
| لا توجد logs في السيرفر | التطبيق لا يرسل الطلب | تحقق من logs التطبيق |
| 404 Not Found | المستخدم/السائق غير موجود | تحقق من رقم الهاتف/driverId |
| 400 Bad Request | FCM token مفقود | تحقق من أن NotificationService مهيأ |
| Token لا يتم حفظه | خطأ في قاعدة البيانات | تحقق من logs السيرفر |

## الخطوات التالية

1. ✅ تحقق من logs السيرفر بعد تسجيل الدخول
2. ✅ استخدم endpoints التحقق من حالة FCM token
3. ✅ تحقق من logs التطبيق
4. ✅ تحقق من قاعدة البيانات مباشرة
5. ✅ إذا استمرت المشكلة، أضف إرسال يدوي للـ token

---

**ملاحظة:** بعد كل تغيير، أعد تشغيل التطبيق والسيرفر واختبر تسجيل الدخول مرة أخرى.

