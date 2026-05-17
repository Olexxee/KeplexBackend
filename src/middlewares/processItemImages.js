import { uploadBufferToCloudinary } from "../config/cloudinaryService.js";

export const processItemImages = async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return next();
    }

    console.log("FILES:", req.files);

    req.files.forEach((f, i) => {
      console.log(i, {
        hasBuffer: !!f.buffer,
        type: typeof f.buffer,
        isBuffer: Buffer.isBuffer(f.buffer),
      });
    });

    const uploadedImages = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadBufferToCloudinary(file.buffer, {
          folder: "keplex-items",
        });

        return {
          url: result.url,
          publicId: result.publicId,
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
