import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uploadDir = "uploads";
const outputDir = "outputs";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const upload = multer({ dest: uploadDir });

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Develac PDF",
    message: "PDF compression service running 🚀",
  });
});

app.post("/compress", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF uploaded" });
  }

  const level = req.body.level || "medium";

  const map = {
    low: "/screen",
    medium: "/ebook",
    high: "/printer",
  };

  const inputPath = req.file.path;
  const fileId = Date.now();
  const outputPath = path.join(outputDir, `${fileId}.pdf`);

  const cmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
-dPDFSETTINGS=${map[level]} -dNOPAUSE -dQUIET -dBATCH \
-sOutputFile=${outputPath} ${inputPath}`;

  exec(cmd, (err) => {
    fs.unlinkSync(inputPath);

    if (err) {
      return res.status(500).json({
        error: "Compression failed",
        details: err.message,
      });
    }

    res.json({
      success: true,
      downloadUrl: `/download/${fileId}`,
    });
  });
});

app.get("/download/:id", (req, res) => {
  const filePath = path.join(outputDir, `${req.params.id}.pdf`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath, "compressed.pdf", () => {
    fs.unlinkSync(filePath);
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
