import slugify from "slugify";
import * as trainingDb from "./trainingProgram.db.js";
import { NotFoundError, BadRequestError } from "../../classes/errorClasses.js";

export const createTrainingProgram = async (data) => {
  const slug = data.slug || slugify(data.title, { lower: true, strict: true });

  // If image was uploaded via middleware, it's in req.uploadedImage
  // or req.body.images for multiple images
  const imageUrl = data.imageUrl || data.heroImage?.url || null;

  return trainingDb.createTrainingProgram({
    title: data.title,
    slug,
    shortDescription: data.shortDescription,
    description: data.description,
    imageUrl: imageUrl,
    price: data.price,
    featured: data.featured ?? false,
    active: data.active ?? true,
    displayOrder: data.displayOrder ?? 0,
    highlights: data.highlights ?? [],
    // If you want to store the full image metadata
    imageMetadata: data.heroImage || data.image || null,
  });
};

export const updateTrainingProgram = async (id, data) => {
  const existing = await trainingDb.findTrainingProgramById(id);
  if (!existing) throw new NotFoundError("Training program not found");

  // Handle image updates from middleware
  const updateData = { ...data };

  // If a new image was uploaded via processSingleImage
  if (data.heroImage) {
    updateData.imageUrl = data.heroImage.url;
    updateData.imageMetadata = data.heroImage;
  }

  // If images were uploaded via processImages
  if (data.images && data.images.length > 0) {
    // Handle multiple images - maybe store as gallery
    updateData.gallery = data.images;
  }

  // Remove temporary fields from update
  delete updateData.heroImage;
  delete updateData.images;

  return trainingDb.updateTrainingProgram(id, updateData);
};

export const deleteTrainingProgram = async (id) => {
  const existing = await trainingDb.findTrainingProgramById(id);
  if (!existing) throw new NotFoundError("Training program not found");
  return trainingDb.deleteTrainingProgram(id);
};

export const getTrainingProgramById = async (id) => {
  const program = await trainingDb.findTrainingProgramById(id);
  if (!program) throw new NotFoundError("Training program not found");
  return program;
};

export const getTrainingBySlug = async (slug) => {
  const program = await trainingDb.findTrainingProgramBySlug(slug);
  if (!program) throw new NotFoundError("Training program not found");
  return program;
};

// public — active only
export const getAllTrainingPrograms = async () => {
  return trainingDb.listTrainingPrograms({ where: { active: true } });
};

// admin — all regardless of status
export const getAdminTrainingPrograms = async () => {
  return trainingDb.listTrainingPrograms();
};

export const toggleTrainingStatus = async (id, active) => {
  const existing = await trainingDb.findTrainingProgramById(id);
  if (!existing) throw new NotFoundError("Training program not found");
  return trainingDb.updateTrainingProgram(id, { active });
};

export const toggleFeaturedTraining = async (id, featured) => {
  const existing = await trainingDb.findTrainingProgramById(id);
  if (!existing) throw new NotFoundError("Training program not found");
  return trainingDb.updateTrainingProgram(id, { featured });
};

// ─── MEDIA SERVICE FUNCTIONS ──────────────────────────────────────

// Single image upload (for the /:id/media endpoint)
export const uploadProgramMedia = async ({ trainingProgramId, file }) => {
  const existing = await trainingDb.findTrainingProgramById(trainingProgramId);
  if (!existing) throw new NotFoundError("Training program not found");

  // file comes from req.uploadedImage from processSingleImage middleware
  // It contains: { url, publicId, mimeType, bytes, format, width, height }

  // Option 1: Update the main image
  return trainingDb.updateTrainingProgram(trainingProgramId, {
    imageUrl: file.url,
    imageMetadata: file, // Store full metadata if needed
  });

  // Option 2: Store in a separate media table (if you have one)
  // return trainingMediaDb.createMedia({
  //   trainingProgramId,
  //   url: file.url,
  //   publicId: file.publicId,
  //   mimeType: file.mimeType,
  //   bytes: file.bytes,
  //   format: file.format,
  //   width: file.width,
  //   height: file.height,
  //   type: 'image',
  //   isMain: true // or false if you want to set it separately
  // });
};

// Multiple images upload
export const uploadMultipleProgramMedia = async ({
  trainingProgramId,
  files,
}) => {
  const existing = await trainingDb.findTrainingProgramById(trainingProgramId);
  if (!existing) throw new NotFoundError("Training program not found");

  // files comes from req.body.images from processImages middleware
  // Each file contains: { url, publicId, mimeType, bytes, format, width, height }

  // Store all images in a gallery array or separate table
  const gallery = files.map((file, index) => ({
    url: file.url,
    publicId: file.publicId,
    mimeType: file.mimeType,
    bytes: file.bytes,
    format: file.format,
    width: file.width,
    height: file.height,
    order: index,
  }));

  // Option 1: Store as JSON in the main table
  return trainingDb.updateTrainingProgram(trainingProgramId, {
    gallery: gallery,
  });

  // Option 2: Store in a separate media table
  // return trainingMediaDb.createManyMedia(
  //   files.map(file => ({
  //     trainingProgramId,
  //     url: file.url,
  //     publicId: file.publicId,
  //     mimeType: file.mimeType,
  //     bytes: file.bytes,
  //     format: file.format,
  //     width: file.width,
  //     height: file.height,
  //     type: 'image',
  //   }))
  // );
};

// Delete media
export const deleteProgramMedia = async (mediaId, trainingProgramId) => {
  const existing = await trainingDb.findTrainingProgramById(trainingProgramId);
  if (!existing) throw new NotFoundError("Training program not found");

  // If using separate media table
  // return trainingMediaDb.deleteMedia(mediaId);

  // If storing gallery as JSON, filter out the media
  const program = await trainingDb.findTrainingProgramById(trainingProgramId);
  if (program.gallery) {
    const updatedGallery = program.gallery.filter(
      (item) => item.publicId !== mediaId || item.id !== mediaId,
    );
    return trainingDb.updateTrainingProgram(trainingProgramId, {
      gallery: updatedGallery,
    });
  }

  throw new NotFoundError("Media not found");
};

// Reorder media
export const reorderProgramMedia = async (trainingProgramId, mediaOrder) => {
  const existing = await trainingDb.findTrainingProgramById(trainingProgramId);
  if (!existing) throw new NotFoundError("Training program not found");

  // If storing gallery as JSON, reorder based on mediaOrder
  if (existing.gallery) {
    const reorderedGallery = mediaOrder
      .map((id) => {
        const item = existing.gallery.find(
          (item) => item.publicId === id || item.id === id,
        );
        return item;
      })
      .filter(Boolean);

    return trainingDb.updateTrainingProgram(trainingProgramId, {
      gallery: reorderedGallery,
    });
  }

  throw new BadRequestError("No gallery found to reorder");
};
