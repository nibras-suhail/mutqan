# مشروع متقن — قواعد العمل

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Auth, Database, Storage, Realtime)
- React Router v7
- React Hook Form + Zod
- QR Code (qrcode.react)
- Lucide React (icons)
- Radix UI (headless primitives)

## مسارات API
- `/` — Dashboard
- `/login` — تسجيل الدخول
- `/register` — إنشاء حساب
- `/orders` — قائمة الطلبات
- `/orders/new` — طلب جديد
- `/orders/:id` — تفاصيل الطلب
- `/orders/:id/edit` — تعديل الطلب
- `/payments` — المدفوعات
- `/transfers` — التحويلات الداخلية
- `/reports/daily` — تقرير نهاية اليوم

## قواعد الكود
- كل ملف مكون له مجلد منفصل فقط لو كان كبيراً، وإلا ملف واحد
- Arabic comments فقط عند الضرورة
- RTL للتوجيه (الاتجاه من اليمين لليسار)
- استخدام Tailwind utility classes قدر الإمكان
- لا تكرار — استخدام المكونات المشتركة
- المصادقة عبر Supabase Auth (session + JWT)
- RLS على كل الجداول
- Real-time للتحويلات فقط
- رفع الصور لـ Supabase Storage
- QR code يُولد من order_no

## اصطلاحات التسمية
- المجلدات: kebab-case
- الملفات: PascalCase للمكونات، kebab-case للباقي
- المتغيرات: camelCase
- الأنواع: PascalCase
- دوال Supabase: snake_case

## الأمان
- لا تكتب secrets في الكود
- استخدم متغيرات البيئة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY
- تحقق من existence وهمية
- RLS إلزامي لكل الجداول
