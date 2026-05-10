import { uploadBufferToCloudinary } from "../config/cloudinaryService.js";

export const processItemImages = async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return next();
    }

    const uploadedImages = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadBufferToCloudinary(file.buffer);

        return {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        };
      }),
    );

    req.body.images = uploadedImages;

    next();
  } catch (error) {
    next(error);
  }
};
