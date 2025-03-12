# استخدم نسخة خفيفة من Node.js
FROM node:18-slim

# تثبيت Chromium ومتطلباته لتشغيل Puppeteer
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  wget \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# إعداد مجلد المشروع
WORKDIR /app
COPY . .

# تثبيت الباكجات
RUN npm install

# متغير البيئة لمسار Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# فتح منفذ التطبيق
EXPOSE 8080

# أمر التشغيل
CMD ["node", "server.js"]
