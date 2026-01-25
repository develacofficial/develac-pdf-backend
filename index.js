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

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const upload = multer({ dest: "uploads/" });

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

  const presets = {
    low: "/screen",
    medium: "/ebook",
    high: "/printer",
  };

  const inputPath = req.file.path;
  const outputPath = path.join(
    "uploads",
    `compressed-${Date.now()}.pdf`
  );

  const cmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
-dPDFSETTINGS=${presets[level]} -dNOPAUSE -dQUIET -dBATCH \
-sOutputFile="${outputPath}" "${inputPath}"`;

  exec(cmd, (err) => {
    if (err) {
      return res.status(500).json({ error: "Compression failed" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="compressed.pdf"'
    );

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);

    stream.on("close", () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
