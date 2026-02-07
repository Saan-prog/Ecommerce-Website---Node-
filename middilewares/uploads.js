const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shopstyle/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

// Multer instance
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// SAME as your existing export
const uploadProductImages = upload.array("image", 5);

module.exports = { uploadProductImages };