import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT;

// folders
const uploadDir = "uploads";
const outputDir = "outputs";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// CORS (browser safe)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

const upload = multer({ dest: uploadDir });

// health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Develac PDF",
    message: "PDF compression service running 🚀"
  });
});

// compress API
app.post("/compress", upload.single("pdf"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    const level = req.body.level || "medium";

    const inputPath = req.file.path;
    const outputPath = path.join(
      outputDir,
      `compressed-${Date.now()}.pdf`
    );

    const qualityMap = {
      low: "/screen",
      medium: "/ebook",
      high: "/printer"
    };

    const gsCommand = `
      gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
      -dPDFSETTINGS=${qualityMap[level]} \
      -dNOPAUSE -dQUIET -dBATCH \
      -sOutputFile="${outputPath}" "${inputPath}"
    `;

    exec(gsCommand, (err) => {
      if (err) {
        return res.status(500).json({
          error: "Compression failed",
          details: err.message
        });
      }

      // IMPORTANT: browser-friendly headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=compressed.pdf"
      );

      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);

      stream.on("close", () => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    });

  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
