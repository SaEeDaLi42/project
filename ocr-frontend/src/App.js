import React, { useState } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(""); // ✅ تخزين رابط الملف بعد الرفع
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {
    if (!file) {
      alert("❌ يرجى اختيار ملف أولًا!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:10000/upload", formData);

      if (response.data.success) {
        setFileUrl(response.data.fileUrl); // ✅ حفظ رابط الملف
        alert("✅ تم رفع الملف بنجاح!");
      } else {
        alert("❌ فشل رفع الملف.");
      }
    } catch (error) {
      console.error("❌ خطأ أثناء رفع الملف:", error);
      alert("❌ حدث خطأ أثناء رفع الملف.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>🔄 محول الملفات باستخدام OCR</h1>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={uploadFile} style={{ margin: "10px", padding: "10px" }}>
        {loading ? "جارٍ التحميل..." : "📤 رفع الملف"}
      </button>

      {fileUrl && (
        <div style={{ marginTop: "20px" }}>
          <p>✅ تم رفع الملف، يمكنك تحميله من هنا:</p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            📂 تحميل الملف
          </a>
        </div>
      )}
    </div>
  );
}

export default App;