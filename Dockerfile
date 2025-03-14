# استخدم صورة Node الرسمية
FROM mcr.microsoft.com/playwright:v1.43.1-jammy

# تحديد مجلد العمل
WORKDIR /app

# نسخ ملفات المشروع إلى الحاوية
COPY . .

# تثبيت الحزم
RUN npm install

# إزالة puppeteer-core كما في postinstall (احتياطي)
RUN rm -rf node_modules/puppeteer-core node_modules/chrome-aws-lambda

# تعيين المتغيرات اللازمة
ENV NODE_ENV=production
ENV PORT=8080

# فتح المنفذ
EXPOSE 8080

# أمر التشغيل
CMD ["node", "server.js"]
