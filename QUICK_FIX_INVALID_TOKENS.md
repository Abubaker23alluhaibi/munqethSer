# ⚡ حل سريع: حذف FCM Tokens غير الصالحة

## المشكلة
الخطأ `messaging/registration-token-not-registered` يحدث لأن الـ FCM token `crooLwqJSgCyyq-XVbYy...` غير صالح (من APK قديم).

## 🚀 الحل السريع (30 ثانية)

### في MongoDB Compass أو Shell:

```javascript
// حذف جميع FCM tokens من المستخدمين
db.users.updateMany(
  { fcmToken: { $exists: true } },
  { $unset: { fcmToken: "" }, $set: { updatedAt: new Date() } }
);

// حذف جميع FCM tokens من السائقين
db.drivers.updateMany(
  { fcmToken: { $exists: true } },
  { $unset: { fcmToken: "" }, $set: { updatedAt: new Date() } }
);
```

### أو في MongoDB Compass:
1. افتح MongoDB Compass
2. اختر قاعدة البيانات `munqeth`
3. اذهب إلى Collection `users`
4. اضغط على **Filter** وأدخل: `{ fcmToken: { $exists: true } }`
5. اضغط على **Update** → **Update many**
6. أدخل: `{ $unset: { fcmToken: "" }, $set: { updatedAt: new Date() } }`
7. كرر نفس الخطوات لـ Collection `drivers`

---

## ✅ بعد الحذف

1. **الكود سيحذف tokens غير الصالحة تلقائياً** في المستقبل
2. **المستخدمون الذين يسجلون دخول** سيرسلون tokens جديدة
3. **الإشعارات ستعمل** فقط للمستخدمين الذين لديهم tokens صالحة

---

## 📱 للمستخدمين

بعد حذف الـ tokens:
- المستخدمون الذين لديهم **APK جديد** ويقومون بتسجيل الدخول سيرسلون tokens جديدة
- المستخدمون الذين لديهم **APK قديم** لن يحصلوا على إشعارات حتى يثبتوا APK جديد ويسجلوا دخول

---

## 🔍 التحقق

بعد الحذف، تحقق من:

```javascript
// يجب أن يكون 0
db.users.countDocuments({ fcmToken: { $exists: true, $ne: null, $ne: "" } });
db.drivers.countDocuments({ fcmToken: { $exists: true, $ne: null, $ne: "" } });
```

---

**⚡ هذا الحل سريع وفوري - استخدمه الآن!**

