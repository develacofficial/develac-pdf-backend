import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT;

// Middlewares
app.use(cors());
app.use(express.json());

// Upload folder
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer config
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Develac PDF backend is running 🚀"
  });
});

// 🔥 PDF COMPRESS API
app.post("/compress", upload.single("pdf"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    const level = req.body.level || "medium";

    const inputPath = req.file.path;
    const outputPath = `${inputPath}-compressed.pdf`;

    // Compression presets
    const presets = {
      low: "/screen",
      medium: "/ebook",
      high: "/printer"
    };

    const preset = presets[level] || presets.medium;

    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${preset} -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;

    exec(command, (error) => {
      if (error) {
        return res.status(500).json({
          error: "Compression failed",
          details: error.message
        });
      }

      res.download(outputPath, "compressed.pdf", () => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    });

  } catch (err) {
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
