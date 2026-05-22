const multer = require("multer");

/**
 * Multer instance configured for memory storage.
 * Accepts images and PDFs up to 10 MB.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Images and PDFs only"));
    }
  },
});

module.exports = upload;
