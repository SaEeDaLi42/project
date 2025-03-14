# استخدم Node الرسمي
FROM mcr.microsoft.com/playwright:v1.43.1-jammy

# إعداد مجلد العمل
WORKDIR /app

# نسخ ملفات البروجكت
COPY package*.json ./
COPY . .

# تثبيت الحزم
RUN npm install

# تثبيت المتصفحات الخاصة بـ Playwright (لو لم تكن موجودة في base image)
RUN npx playwright install --with-deps

# تحديد المنفذ
EXPOSE 8080

# أمر التشغيل
CMD ["node", "server.js"]
