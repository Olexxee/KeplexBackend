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

export const processSingleTrainingImage = async (req, res, next) => {
  try {
    console.log("processSingleTrainingImage called");
    console.log(
      "req.file:",
      req.file?.originalname,
      req.file?.mimetype,
      req.file?.size,
    );

    if (!req.file) {
      console.log("No file found, skipping upload");
      return next();
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "keplex-trainings",
    });

    console.log("Cloudinary result:", result);

    req.uploadedFile = {
      url: result.url,
      publicId: result.publicId,
      mimeType: req.file.mimetype,
      bytes: result.bytes,
    };

    next();
  } catch (err) {
    console.error("processSingleTrainingImage error:", err.message);
    next(err);
  }
};

export const processMultipleUploads =
  ({ folder, bodyField = "images" }) =>
  async (req, res, next) => {
    try {
      if (!req.files?.length) return next();

      const uploads = await Promise.all(
        req.files.map(async (file) => {
          const result = await uploadBufferToCloudinary(file.buffer, {
            folder,
          });

          return {
            url: result.url,
            publicId: result.publicId,
            mimeType: file.mimetype,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
          };
        }),
      );

      req.body[bodyField] = uploads;

      next();
    } catch (err) {
      next(err);
    }
  };

export const processSingleUpload =
  ({ folder, requestField = "uploadedFile" }) =>
  async (req, res, next) => {
    try {
      if (!req.file) return next();

      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder,
      });

      req[requestField] = {
        url: result.url,
        publicId: result.publicId,
        mimeType: req.file.mimetype,
        bytes: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height,
      };

      next();
    } catch (err) {
      next(err);
    }
  };