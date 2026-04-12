const path  = require('path');
const fs    = require('fs');

let multer;
try { multer = require('multer'); } catch (_) {
  console.warn('[Storage] multer not installed — file uploads disabled');
}

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure directories exist
const ensureDirs = () => {
  ['attachments','avatars','audio'].forEach(dir => {
    const p = path.join(UPLOAD_DIR, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
};
ensureDirs();

const ALLOWED_TYPES = {
  attachment: /image\/(jpeg|png|gif|webp)|application\/(pdf|msword|vnd\.openxmlformats|vnd\.ms-excel|zip)|text\/(plain|csv)|audio\/(mpeg|wav)|video\/(mp4|webm)/,
  avatar:     /image\/(jpeg|png|gif|webp)/,
  audio:      /audio\/(mpeg|wav|ogg)/,
};

const createStorage = (subdir) => {
  if (!multer) return null;
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, subdir)),
    filename:    (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, safe);
    },
  });
};

const createUploader = (subdir, typeKey = 'attachment', maxMB = 25) => {
  if (!multer) return null;
  return multer({
    storage: createStorage(subdir),
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_TYPES[typeKey].test(file.mimetype)) cb(null, true);
      else cb(new Error(`File type not allowed: ${file.mimetype}`));
    },
  });
};

module.exports = {
  uploadAttachment: createUploader('attachments', 'attachment', 25),
  uploadAvatar:     createUploader('avatars',     'avatar',     5),
  uploadAudio:      createUploader('audio',       'audio',      10),
  UPLOAD_DIR,
};
