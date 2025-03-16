import React, { useState } from "react";
import axios from "axios";

export default function FileUpload({ setResult }) {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("❌ الرجاء اختيار ملف!");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", format);

    setLoading(true);

    try {
      const response = await axios.post("http://localhost:8080/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(response.data);
    } catch (error) {
      alert("❌ حدث خطأ أثناء المعالجة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-lg">
      <input type="file" onChange={handleFileChange} className="mb-3 border rounded w-full p-2" />
      
      <select value={format} onChange={(e) => setFormat(e.target.value)} className="border rounded w-full p-2 mb-3">
        <option value="pdf">PDF</option>
        <option value="docx">Word</option>
        <option value="txt">Text</option>
      </select>

      <button
        onClick={handleUpload}
        className={`bg-blue-500 text-white px-4 py-2 rounded w-full ${
          loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
        }`}
        disabled={loading}
      >
        {loading ? "📡 جاري المعالجة..." : "🚀 رفع وتحليل"}
      </button>
    </div>
  );
}
