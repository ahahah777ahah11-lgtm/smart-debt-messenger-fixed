# نظام ديون العملاء وإرسال رسائل SMS

هذا المشروع مبني باستخدام **React + Vite + TypeScript** وليس مشروع Flutter. لذلك كان أمر `flutter pub get` يفشل برسالة `Expected to find project root in current working directory` لأنه لا يوجد ملف `pubspec.yaml` في المستودع.

## البناء عبر GitHub Actions / Klencod IDE

1. ارفع محتويات هذا المشروع إلى مستودع GitHub.
2. تأكد أن ملف `.github/workflows/build.yml` موجود.
3. من تبويب **Actions** شغّل **Build Smart Debt Messenger** أو ادفع commit جديدًا.
4. ينتج البناء ملفًا باسم `smart-debt-messenger-web-dist` يحتوي على مجلد `dist/`.

تقوم العملية بتثبيت حزم Node.js، ثم فحص TypeScript، ثم بناء التطبيق. إذا فشل فحص TypeScript فستظهر تفاصيل الخطأ في خطوة **Type check**.

## إنشاء APK باستخدام HTML to APK Builder

1. نزّل artifact المسمى `smart-debt-messenger-web-dist` من صفحة تشغيل GitHub Actions وفك ضغطه.
2. استخدم ملف `index.html` الموجود داخله ومجلدات الأصول التابعة له في أداة HTML to APK Builder.
3. تم ضبط Vite على `base: './'` حتى تكون مراجع ملفات الواجهة نسبية ومناسبة للتغليف المحلي.

**تنبيه مهم:** ملف `dist` هو واجهة الويب فقط. ميزات تتطلب خادمًا أو مفتاح `GEMINI_API_KEY` أو اتصالًا بخدمة خارجية لن تعمل تلقائيًا داخل APK دون استضافة الخادم أو إضافة تكامل مناسب. كما أن إرسال SMS تلقائيًا يخضع لصلاحيات Android وقيود الجهاز والتطبيق.

## التشغيل المحلي

يتطلب Node.js 22 أو أحدث:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

إذا كنت تريد بناء APK Flutter أصليًا، فيجب تحويل المشروع إلى Flutter أو إنشاء غلاف Android مناسب؛ لا يكفي تشغيل `flutter pub get` على مشروع React.
