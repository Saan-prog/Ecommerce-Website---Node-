const multer = require("multer");
const path = require("path");

// Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// File filter
function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        return cb(new Error("Only images are allowed"), false);
    }
    cb(null, true);
}

// Multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

//  <-- THIS IS WHERE YOU DEFINE
const uploadProductImages = upload.array("image", 5);

module.exports = { uploadProductImages };
