import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";

const app = express();
const PORT = process.env.PORT;

// ✅ ensure upload folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Develac PDF backend is running 🚀"
  });
});

app.post("/compress", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF uploaded" });
  }

  const level = req.body.level || "medium";
  const inputPath = req.file.path;
  const outputPath = `compressed-${Date.now()}.pdf`;

  const map = {
    low: "/screen",
    medium: "/ebook",
    high: "/printer"
  };

  const cmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
-dPDFSETTINGS=${map[level]} -dNOPAUSE -dQUIET -dBATCH \
-sOutputFile=${outputPath} ${inputPath}`;

  exec(cmd, (err) => {
    if (err) {
      return res.status(500).json({
        error: "Compression failed",
        details: err.message
      });
    }

    res.download(outputPath, () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
