# استخدم صورة جاهزة تدعم Playwright
FROM mcr.microsoft.com/playwright:v1.41.1-jammy

# إنشاء مجلد التطبيق
WORKDIR /app

# نسخ ملفات البروجكت إلى الحاوية
COPY . .

# تثبيت التبعيات
RUN npm install

# تعيين المتغيرات للبيئة
ENV PORT=8080

# فتح المنفذ
EXPOSE 8080

# أمر التشغيل
CMD ["node", "server.js"]
