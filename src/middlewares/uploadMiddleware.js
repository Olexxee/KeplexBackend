import multer from "multer";
import { BadRequestError } from "../classes/errorClasses.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new BadRequestError("Only JPEG, PNG, and WEBP images are allowed"),
    );
  }
  cb(null, true);
};

// existing — for item images
export const uploadItemImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
}).array("images", 6);

// new — for training program cover image
export const uploadTrainingImage = (req, res, next) => {
  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  }).single("image");

  upload(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err.message, err.code);
      return next(err);
    }
    console.log("Multer success, req.file:", req.file?.originalname);
    next();
  });
};