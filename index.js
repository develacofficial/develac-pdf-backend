import express from "express";
import cors from "cors";
import multer from "multer";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- BASIC SETUP -------------------- */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());

/* -------------------- UPLOAD FOLDER -------------------- */

const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/* -------------------- HEALTH CHECK -------------------- */

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Develac PDF",
    message: "PDF compression service running 🚀"
  });
});

/* -------------------- PDF COMPRESS API -------------------- */

app.post("/compress", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    const level = req.body.level || "medium";

    const inputPath = req.file.path;
    const outputPath = path.join(
      UPLOAD_DIR,
      `compressed-${Date.now()}.pdf`
    );

    const QUALITY_MAP = {
      low: "/screen",
      medium: "/ebook",
      high: "/printer"
    };

    const pdfSetting = QUALITY_MAP[level] || "/ebook";

    const gsArgs = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${pdfSetting}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    execFile("gs", gsArgs, async (error) => {
      if (error) {
        cleanup(inputPath);
        return res.status(500).json({
          error: "Compression failed",
          details: error.message
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=compressed.pdf"
      );

      const stream = fs.createReadStream(outputPath);

      stream.pipe(res);

      stream.on("close", () => {
        cleanup(inputPath);
        cleanup(outputPath);
      });
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

/* -------------------- CLEANUP -------------------- */

function cleanup(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/* -------------------- START SERVER -------------------- */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Develac PDF backend running on port ${PORT}`);
});
