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

export const uploadItemImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
}).array("images", 6);
