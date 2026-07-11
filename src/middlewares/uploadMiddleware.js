// middlewares/uploadMiddleware.js
import multer from "multer";
import { BadRequestError } from "../classes/errorClasses.js";

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(
      new BadRequestError("Only JPEG, PNG, WEBP, and GIF images are allowed"),
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
});

// Single image upload
export const uploadSingleImage = upload.single("image");

// Multiple images upload (max 5)
export const uploadMultipleImages = upload.array("images", 5);

// Variant images upload (max 5)
export const uploadVariantImages = upload.array("variantImages", 5);

// Product hero image upload
export const uploadHeroImage = upload.single("heroImage");
