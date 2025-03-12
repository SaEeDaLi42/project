const { onObjectFinalized } = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const libre = require("libreoffice-convert");
const PDFDocument = require("pdfkit");
const fs = require("fs").promises;
const path = require("path");
const util = require("util");

admin.initializeApp();
const storage = new Storage();
const convertAsync = util.promisify(libre.convert); // تحويل `convert` إلى `Promise`

exports.convertToPDF = onObjectFinalized(async (event) => {
  try {
    const filePath = event.data.name;
    const bucketName = event.data.bucket;
    const fileName = path.basename(filePath);
    const bucket = storage.bucket(bucketName);

    // التحقق مما إذا كان الملف PDF بالفعل
    if (fileName.endsWith(".pdf")) {
      logger.info(`🚀 الملف ${fileName} هو بالفعل PDF، لا حاجة للتحويل.`);
      return null;
    }

    const tempFilePath = path.join("/tmp", fileName);
    const outputFilePath = tempFilePath.replace(/\.\w+$/, ".pdf");

    // تنزيل الملف من Firebase Storage إلى `/tmp`
    await bucket.file(filePath).download({ destination: tempFilePath });
    logger.info(`✅ تم تنزيل الملف: ${fileName}`);

    let pdfBuffer;

    // 🔹 إذا كان الملف صورة (`.png`, `.jpg`)، استخدم `PDFKit`
    if (fileName.match(/\.(jpg|jpeg|png)$/i)) {
      logger.info(`📷 تحويل الصورة ${fileName} إلى PDF...`);
      const doc = new PDFDocument();
      const pdfPath = path.join("/tmp", fileName.replace(/\.\w+$/, ".pdf"));
      const pdfStream = fs.createWriteStream(pdfPath);
      doc.pipe(pdfStream);
      doc.image(tempFilePath, { fit: [500, 700], align: "center", valign: "center" });
      doc.end();
      await new Promise((resolve) => pdfStream.on("finish", resolve));
      pdfBuffer = await fs.readFile(pdfPath);
    } 
    // 🔹 إذا كان الملف مستند (`.docx`, `.xlsx`, `.pptx`)، استخدم `libreoffice-convert`
    else {
      logger.info(`📄 تحويل المستند ${fileName} إلى PDF باستخدام LibreOffice...`);
      const fileBuffer = await fs.readFile(tempFilePath);
      pdfBuffer = await convertAsync(fileBuffer, ".pdf", undefined);
    }

    // حفظ الملف الجديد بصيغة PDF
    await fs.writeFile(outputFilePath, pdfBuffer);
    logger.info(`🔄 تم تحويل ${fileName} إلى PDF.`);

    // رفع الملف المحوّل إلى Firebase Storage
    const newFileName = fileName.replace(/\.\w+$/, ".pdf");
    const newFilePath = `converted/${newFileName}`;
    await bucket.upload(outputFilePath, { destination: newFilePath });
    logger.info(`⬆️ تم رفع الملف المحوّل: ${newFileName}`);

    // حذف الملفات المؤقتة
    await fs.unlink(tempFilePath);
    await fs.unlink(outputFilePath);

    return null;
  } catch (error) {
    logger.error("❌ حدث خطأ أثناء تحويل الملف:", error);
    throw new Error("فشل تحويل الملف إلى PDF.");
  }
});
