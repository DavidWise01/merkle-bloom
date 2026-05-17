const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Volume path ────────────────────────────────────────────────────────────────
const UPLOAD_DIR = '/mnt/data/kb';

// Ensure the upload directory exists (creates it if the volume is freshly mounted
// or if running locally without the volume present).
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Multer storage ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => cb(null, file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB per file
});

// ── Static files (serves index.html from repo root) ───────────────────────────
app.use(express.static(path.join(__dirname)));

// ── GET /upload — upload UI ────────────────────────────────────────────────────
app.get('/upload', (_req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});

// ── GET /files — JSON list of stored files ─────────────────────────────────────
app.get('/files', (_req, res) => {
  try {
    const entries = fs.readdirSync(UPLOAD_DIR).map((name) => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, name));
      return {
        name,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });
    res.json({ files: entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /upload — receive one or more files ───────────────────────────────────
app.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files received.' });
  }

  const saved = req.files.map((f) => ({
    name:         f.originalname,
    size:         f.size,
    savedTo:      f.path,
  }));

  res.json({ uploaded: saved });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`green-paper listening on port ${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
});
