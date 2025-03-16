import React, { useState } from "react";

export default function ResultDisplay({ result }) {
  const [text, setText] = useState(result.content);

  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "document.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-4 w-full max-w-lg">
      <h2 className="text-xl font-semibold text-gray-700 mb-2">📜 النص المستخرج:</h2>
      <textarea
        className="border rounded w-full p-2 h-40"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={handleDownload} className="mt-4 bg-green-500 text-white px-4 py-2 rounded w-full">
        ⬇️ تحميل النص
      </button>
    </div>
  );
}
