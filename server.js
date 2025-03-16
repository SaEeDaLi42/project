import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import { spawnSync } from "child_process";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { BlobServiceClient } from "@azure/storage-blob";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer"; // ✅ NEW

// تحميل متغيرات البيئة
dotenv.config();
console.log("✅ تم تحميل متغيرات البيئة");

// إعداد Azure Blob Storage
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.error("❌ لم يتم العثور على AZURE_STORAGE_CONNECTION_STRING");
  process.exit(1);
}
const containerName = "uploads";
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(containerName);

// إعداد Azure Document Intelligence
const DOC_AI_ENDPOINT = process.env.DOC_AI_ENDPOINT;
const DOC_AI_KEY = process.env.DOC_AI_KEY;
let documentClient;
if (DOC_AI_ENDPOINT && DOC_AI_KEY) {
  documentClient = new DocumentAnalysisClient(DOC_AI_ENDPOINT, new AzureKeyCredential(DOC_AI_KEY));
} else {
  console.warn("⚠️ لم يتم تهيئة Azure Document Intelligence. سيتم تجاهل التحليل الذكي.");
}

// إعداد Express
const PORT = process.env.PORT || 8080;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// إعداد multer
const upload = multer({ dest: os.tmpdir() });

// اختبار الخادم
app.get("/", (req, res) => {
  res.send("🚀 الخادم يعمل! استخدم POST على /upload أو /convert");
});

// رفع الملفات إلى Azure
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
    console.error("❌ خطأ أثناء رفع الملف:", error.stack);
    res.status(500).json({ success: false, message: "❌ فشل رفع الملف.", error: error.message });
  }
});

// تحليل المستندات باستخدام Document Intelligence
app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "❌ لم يتم رفع ملف!" });
    if (!documentClient) return res.status(500).json({ success: false, message: "⚠️ خدمة تحليل المستندات غير مفعلة." });

    const fileBuffer = fs.readFileSync(req.file.path);
    const poller = await documentClient.beginAnalyzeDocument("prebuilt-read", fileBuffer);
    const result = await poller.pollUntilDone();

    const extractedText = result?.content || "";
    fs.unlinkSync(req.file.path);

    res.json({ success: true, content: extractedText });
  } catch (error) {
    console.error("❌ خطأ أثناء تحليل المستند:", error);
    res.status(500).json({ success: false, message: "❌ فشل تحليل المستند.", error: error.message });
  }
});

// تحويل الملفات
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

    console.log("📂 بدء التحويل:");
    console.log("📎 الاسم:", fileName);
    console.log("📄 الامتداد:", extension);
    console.log("🎯 الصيغة المطلوبة:", requestedFormat);
    console.log("📁 ملف مؤقت:", filePath);
    console.log("📁 بعد التحويل:", convertedFilePath);

    if (requestedFormat === "pdf" && extension === ".docx") {
      const result = spawnSync("libreoffice", [
        "--headless",
        "--convert-to", "pdf",
        "--outdir", path.dirname(convertedFilePath),
        filePath,
      ]);

      if (result.error) throw result.error;

      const outputFileName = path.basename(filePath, path.extname(filePath)) + ".pdf";
      const convertedFullPath = path.join(path.dirname(convertedFilePath), outputFileName);
      fs.renameSync(convertedFullPath, convertedFilePath);

      console.log("✅ تم التحويل باستخدام LibreOffice");

    } else if ([".jpg", ".jpeg", ".png"].includes(extension) && requestedFormat === "webp") {
      await sharp(filePath).toFormat("webp").toFile(convertedFilePath);
      console.log("✅ تم تحويل الصورة إلى WebP.");

    } else if (extension === ".xlsx" && requestedFormat === "csv") {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];
      const csvData = worksheet.getSheetValues().map(row => row?.join(",") || "").join("\n");
      fs.writeFileSync(convertedFilePath, csvData);
      console.log("✅ تم تحويل Excel إلى CSV.");

    } else {
      console.warn("⚠️ صيغة غير مدعومة:", extension, "->", requestedFormat);
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
    console.log("☁️ تم رفع الملف المحول إلى Azure:", convertedFileUrl);

    res.json({ success: true, fileUrl: convertedFileUrl });

  } catch (error) {
    console.error("❌ خطأ أثناء التحويل!");
    console.error("📛 الرسالة:", error.message);
    console.error("🧱 التفاصيل:\n", error.stack);

    res.status(500).json({
      success: false,
      message: "❌ فشل التحويل.",
      error: error.stack
    });
  }
});

// تنبيه عند استخدام GET بدل POST
app.get("/convert", (req, res) => {
  res.status(400).json({ success: false, message: "❌ استخدم POST بدل GET" });
});

console.log("🟢 جاهز لتشغيل الخادم...");

// بدء الخادم
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
});

// التعامل مع الأخطاء غير المتوقعة
process.on("uncaughtException", (err) => {
  console.error("❌ خطأ غير متوقع:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ رفض غير معالج:", reason);
});
