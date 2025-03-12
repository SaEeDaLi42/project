import React, { useState } from "react";
import {
  Container,
  Typography,
  Button,
  TextField,
  MenuItem,
  Select,
  Paper,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [convertedFileUrl, setConvertedFileUrl] = useState("");
  const [format, setFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setConvertedFileUrl("");
      setError("");
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError("⚠️ الرجاء اختيار ملف للتحويل!");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", format);

    try {
      const response = await fetch(
        "https://digital-library-backend.azurewebsites.net/convert",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`الخادم رد بحالة ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setConvertedFileUrl(result.fileUrl);
      } else {
        setError("❌ فشل التحويل: " + result.message);
      }
    } catch (error) {
      console.error("❌ خطأ:", error);
      setError("❌ حدث خطأ أثناء الاتصال بالخادم: " + error.message);
    }

    setLoading(false);
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: "50px", textAlign: "center" }}>
      <Paper elevation={3} style={{ padding: "30px", borderRadius: "10px" }}>
        <Typography variant="h4" gutterBottom>
          🔄 محول المستندات
        </Typography>

        {error && (
          <Alert severity="error" style={{ marginBottom: "15px" }}>
            {error}
          </Alert>
        )}

        <Box display="flex" flexDirection="column" gap="15px">
          <TextField
            variant="outlined"
            value={fileName}
            placeholder="📂 اختر ملف..."
            disabled
            fullWidth
          />
          <Button variant="contained" component="label">
            📂 استعراض
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
        </Box>

        <Typography variant="h6" style={{ marginTop: "20px" }}>
          🔄 اختر الصيغة:
        </Typography>
        <Select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          fullWidth
        >
          <MenuItem value="pdf">📄 PDF</MenuItem>
          <MenuItem value="csv">📊 CSV</MenuItem>
          <MenuItem value="webp">🖼️ WEBP</MenuItem>
        </Select>

        {file && (
          <Button
            variant="contained"
            color="success"
            onClick={handleConvert}
            fullWidth
            style={{ marginTop: "10px" }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "🔄 تحويل"}
          </Button>
        )}

        {convertedFileUrl && (
          <Button
            variant="contained"
            color="info"
            onClick={() => window.open(convertedFileUrl, "_blank")}
            fullWidth
            style={{ marginTop: "10px" }}
          >
            ⬇️ تحميل الملف المحوّل
          </Button>
        )}
      </Paper>
    </Container>
  );
}

export default App;
