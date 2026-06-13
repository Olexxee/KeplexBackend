import { uploadBufferToCloudinary } from "../config/cloudinaryService.js";

// Process multiple item images (Handles req.files from multer .array())
export const processItemImages = async (req, res, next) => {
  try {
    // If no files were uploaded via multer, just proceed
    if (!req.files || req.files.length === 0) return next();

    // Loop through all uploaded file buffers and send them to Cloudinary
    const uploadPromises = req.files.map(async (file) => {
      const result = await uploadBufferToCloudinary(file.buffer, {
        folder: "keplex-items", // Organized folder for store items
      });

      return {
        url: result.url,
        publicId: result.publicId,
        mimeType: file.mimetype,
        bytes: result.bytes,
        format: result.format, // optional extras
        width: result.width,
        height: result.height,
      };
    });

    // Wait for all uploads to complete successfully
    const uploadedImages = await Promise.all(uploadPromises);

    // CRITICAL: Attach to req.body.images so validation & service find it!
    req.body.images = uploadedImages;

    next();
  } catch (err) {
    next(err);
  }
};

