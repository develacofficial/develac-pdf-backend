import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Multer setup
const upload = multer({ dest: "uploads/" });

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Develac PDF Backend",
    message: "Compress PDF service running 🚀",
  });
});

// Compress PDF
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

  const cmd = `
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
-dPDFSETTINGS=${presets[level] || presets.medium} \
-dNOPAUSE -dQUIET -dBATCH \
-sOutputFile="${outputPath}" "${inputPath}"
`;

  exec(cmd, (error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "PDF compression failed" });
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
  console.log(`🚀 Develac backend running on port ${PORT}`);
});

// Merge PDFs
app.post("/merge", upload.array("pdfs", 10), (req, res) => {
  if (!req.files || req.files.length < 2) {
    return res.status(400).json({ error: "At least 2 PDFs required" });
  }

  // Ensure all files are PDFs
  for (const file of req.files) {
    if (!file.originalname.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ error: "Only PDF files allowed" });
    }
  }

  const inputFiles = req.files.map(f => `"${f.path}"`).join(" ");
  const outputPath = path.join(
    "uploads",
    `merged-${Date.now()}.pdf`
  );

  const cmd = `
gs -dBATCH -dNOPAUSE -q \
-sDEVICE=pdfwrite \
-sOutputFile="${outputPath}" \
${inputFiles}
`;

  exec(cmd, (error) => {
    if (error) {
      console.error("Merge error:", error);
      return res.status(500).json({ error: "PDF merge failed" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="merged.pdf"'
    );

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);

    stream.on("close", () => {
      // cleanup
      req.files.forEach(f => fs.unlinkSync(f.path));
      fs.unlinkSync(outputPath);
    });
  });
});
