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

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({ dest: uploadDir });

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Develac PDF",
    message: "PDF compression service running 🚀"
  });
});

app.post("/compress", upload.single("pdf"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    const level = req.body.level || "medium";

    const map = {
      low: "/screen",
      medium: "/ebook",
      high: "/printer"
    };

    const inputPath = req.file.path;
    const outputPath = path.join(uploadDir, `compressed-${Date.now()}.pdf`);

    const cmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
-dPDFSETTINGS=${map[level]} -dNOPAUSE -dQUIET -dBATCH \
-sOutputFile=${outputPath} ${inputPath}`;

    exec(cmd, (err) => {
      if (err) {
        return res.status(500).json({ error: "Compression failed" });
      }

      // 🔥 VERY IMPORTANT HEADERS (browser ke liye)
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
