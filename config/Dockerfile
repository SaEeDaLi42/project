# Dockerfile
FROM mcr.microsoft.com/playwright:v1.41.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD [ "npm", "start" ]
