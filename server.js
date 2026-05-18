const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_FILES_PER_UPLOAD = 20;      // per single upload session (was 15, now flexible)
const MAX_FILE_SIZE_MB = 500;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.uploadFolder) {
      const folderName = `${Date.now()}_guest`;
      req.uploadFolder = path.join(UPLOADS_DIR, folderName);
      fs.mkdirSync(req.uploadFolder, { recursive: true });
    }
    cb(null, req.uploadFolder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');
  const isOctet = file.mimetype === 'application/octet-stream';
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg','.jpeg','.png','.gif','.webp','.heic','.heif','.bmp','.tiff','.tif','.mp4','.mov','.avi','.mkv','.webm','.3gp','.m4v','.wmv','.flv'];
  if (isImage || isVideo || (isOctet && allowedExts.includes(ext))) cb(null, true);
  else cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { files: MAX_FILES_PER_UPLOAD, fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/upload', (req, res) => {
  upload.array('files', MAX_FILES_PER_UPLOAD)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, error: `Maksimalno ${MAX_FILES_PER_UPLOAD} datoteka po uploadu.` });
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: `Svaka datoteka mora biti ispod ${MAX_FILE_SIZE_MB}MB.` });
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ success: false, error: 'Nisu primljene datoteke.' });

    const folderName = path.basename(req.uploadFolder);
    const meta = {
      guestName: 'Gost',
      uploadedAt: new Date().toISOString(),
      fileCount: req.files.length,
      files: req.files.map(f => ({
        name: f.filename,
        originalName: f.originalname,
        size: f.size,
        type: f.mimetype || 'image/jpeg',
        url: `/uploads/${folderName}/${f.filename}`
      }))
    };

    fs.writeFileSync(path.join(req.uploadFolder, '_info.json'), JSON.stringify(meta, null, 2));
    console.log(`✅ [${new Date().toISOString()}] Uploaded ${req.files.length} file(s)`);
    res.json({ success: true, count: req.files.length });
  });
});

app.get('/api/gallery', (req, res) => {
  try {
    const folders = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        try { return JSON.parse(fs.readFileSync(path.join(UPLOADS_DIR, d.name, '_info.json'), 'utf8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    const allFiles = folders.flatMap(guest =>
      guest.files.map(f => ({
        url: f.url,
        type: f.type || 'image/jpeg',
        guestName: guest.guestName,
        uploadedAt: guest.uploadedAt
      }))
    );
    res.json({ total: allFiles.length, files: allFiles });
  } catch (err) {
    res.status(500).json({ error: 'Greška pri učitavanju galerije.' });
  }
});

// Bind to 0.0.0.0 so ALL devices (phones, laptops) can reach this server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌹 Wedding server running at http://0.0.0.0:${PORT}`);
  console.log(`   Accessible from any device: http://178.104.245.117:${PORT}\n`);
});
