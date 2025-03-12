import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import ExcelJS from "exceljs";
import sharp from "sharp";
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import { BlobServiceClient } from "@azure/storage-blob";

// ✅ تحميل متغيرات البيئة
dotenv.config();
console.log("✅ تم تحميل متغيرات البيئة");

// ✅ مسار المتصفح في Azure Linux
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
console.log("📍 مسار المتصفح:", executablePath);
console.log("📁 هل المتصفح موجود؟", fs.existsSync(executablePath));

// 🟦 Azure إعداد
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.error("❌ لم يتم العثور على AZURE_STORAGE_CONNECTION_STRING");
  process.exit(1);
}

const containerName = "upload";
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(containerName);

// 🟢 إعداد Express
const PORT = process.env.PORT;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 📥 إعداد multer
const upload = multer({ dest: os.tmpdir() });

// ✅ اختبار السيرفر
app.get("/", (req, res) => {
  res.send("🚀 الخادم يعمل! استخدم POST على /upload أو /convert");
});

// 📤 رفع الملفات إلى Azure
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "❌ يجب تحديد ملف للرفع!" });

    const originalFileName = req.file.originalname.replace(/\s+/g, "_");
    const fileName = `${Date.now()}_${originalFileName}`;
    const blobClient = containerClient.getBlockBlobClient(fileName);
    const fileBuffer = fs.readFileSync(req.file.path);

    await blobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    fs.unlinkSync(req.file.path);
    const fileUrl = blobClient.url;

    res.json({ success: true, message: "✅ تم رفع الملف بنجاح!", fileUrl });
  } catch (error) {
    console.error("❌ خطأ أثناء رفع الملف:", error);
    res.status(500).json({ success: false, message: "❌ فشل رفع الملف.", error: error.message });
  }
});

// 🔁 تحويل الملفات
app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.body.format) {
      return res.status(400).json({ success: false, message: "❌ يجب رفع ملف وتحديد الصيغة المطلوبة!" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const extension = path.extname(fileName).toLowerCase();
    const requestedFormat = req.body.format.toLowerCase();
    const convertedFilePath = path.join(os.tmpdir(), `converted_${Date.now()}.${requestedFormat}`);

    if (requestedFormat === "pdf" && extension === ".docx") {
      const result = await mammoth.convertToHtml({ path: filePath });

      const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(result.value);
      await page.pdf({ path: convertedFilePath, format: "A4" });
      await browser.close();
    } else if ([".jpg", ".jpeg", ".png"].includes(extension) && requestedFormat === "webp") {
      await sharp(filePath).toFormat("webp").toFile(convertedFilePath);
    } else if (extension === ".xlsx" && requestedFormat === "csv") {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];
      const csvData = worksheet.getSheetValues().map(row => row?.join(",") || "").join("\n");
      fs.writeFileSync(convertedFilePath, csvData);
    } else {
      return res.status(400).json({ success: false, message: "❌ الصيغة غير مدعومة!" });
    }

    const convertedBlobClient = containerClient.getBlockBlobClient(path.basename(convertedFilePath));
    const convertedFileBuffer = fs.readFileSync(convertedFilePath);

    await convertedBlobClient.uploadData(convertedFileBuffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    fs.unlinkSync(filePath);
    fs.unlinkSync(convertedFilePath);

    const convertedFileUrl = convertedBlobClient.url;
    res.json({ success: true, fileUrl: convertedFileUrl });

  } catch (error) {
    console.error("❌ خطأ أثناء التحويل:", error.stack);
    res.status(500).json({
      success: false,
      message: "❌ فشل التحويل.",
      error: error.stack
    });
  }
});

// ❌ تنبيه عند استخدام GET بدل POST
app.get("/convert", (req, res) => {
  res.status(400).json({ success: false, message: "❌ استخدم POST بدل GET" });
});

// 🚀 بدء الخادم
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
});

// 🛡️ التعامل مع الأخطاء غير المتوقعة
process.on("uncaughtException", (err) => {
  console.error("❌ خطأ غير متوقع:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ رفض غير معالج:", reason);
});
