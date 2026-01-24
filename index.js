import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

// Upload folder
const upload = multer({ dest: "uploads/" });

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Develac PDF backend is running 🚀"
  });
});

// Compress PDF API
app.post("/compress", upload.single("pdf"), (req, res) => {
  try {
    const level = req.body.level || "medium";
    const inputPath = req.file.path;
    const outputPath = `compressed-${Date.now()}.pdf`;

    const gsLevelMap = {
      low: "/screen",
      medium: "/ebook",
      high: "/printer"
    };

    const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
-dPDFSETTINGS=${gsLevelMap[level]} -dNOPAUSE -dQUIET -dBATCH \
-sOutputFile=${outputPath} ${inputPath}`;

    exec(gsCommand, (error) => {
      if (error) {
        return res.status(500).json({
          error: "Compression failed",
          details: error.message
        });
      }

      res.download(outputPath, () => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    });

  } catch (err) {
    res.status(500).json({
      error: "Unexpected server error",
      details: err.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
