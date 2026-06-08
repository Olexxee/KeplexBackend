import { uploadBufferToCloudinary } from "../config/cloudinaryService.js";

export const processTrainingImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "keplex-training",
    });

    req.uploadedFile = {
      url: result.url,
      publicId: result.publicId,
      mimeType: req.file.mimetype,
      bytes: result.bytes,
    };

    next();
  } catch (err) {
    next(err);
  }
};
