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
    // Client compresses to ~500 KB before upload, so 5 MB is generous
    // headroom — anything larger is a client that bypassed compression
    // or an explicit rejection we want to surface, not silently accept.
    fileSize: 5 * 1024 * 1024,
  },
});

// Single image upload
export const uploadSingleImage = upload.single("image");

// Multiple images upload.
// Cap is *per request*, not per resource: a multi-variant product create
// flattens every variant's files into a single array, so this needs to
// cover the whole payload.
export const uploadMultipleImages = upload.array("images", 20);

// Variant images upload — same reasoning. 20 covers e.g. 4 variants x 5
// images each; raise if you allow more images per variant than that.
export const uploadVariantImages = upload.array("variantImages", 20);

// Product hero image upload
export const uploadHeroImage = upload.single("heroImage");

// Review images — capped tighter; reviews rarely need many.
export const uploadReviewImages = upload.array("reviewImages", 5);