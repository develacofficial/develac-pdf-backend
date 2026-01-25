import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT;

// ======================
// CORS (IMPORTANT FIX)
// ======================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"]
  })
);

app.use(express.json());

// ======================
// Ensure folders exist
// ======================
const uploadDir = "uploads";
const outputDir = "outputs";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// ======================
// Multer setup
// ======================
const upload = multer({ dest: uploadDir });

// ======================
// Health check
// ======================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Develac PDF",
    message: "PDF compression service running 🚀"
  });
});

// ======================
// Compress API
// ======================
app.post("/compress", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF uploaded" });
  }

  const level = req.body.level || "medium";

  const qualityMap = {
    low: "/screen",
    medium: "/ebook",
    high: "/printer"
  };

  const inputPath = req.file.path;
  const outputPath = path.join(
    outputDir,
    `compressed-${Date.now()}.pdf`
  );

  const gsCommand = `
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
-dPDFSETTINGS=${qualityMap[level]} \
-dNOPAUSE -dQUIET -dBATCH \
-sOutputFile=${outputPath} ${inputPath}
`;

  exec(gsCommand, (error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        error: "Compression failed"
      });
    }

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="compressed.pdf"'
    );

    res.sendFile(path.resolve(outputPath), () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

// ======================
// Start server
// ======================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Develac PDF backend running on port ${PORT}`);
});
