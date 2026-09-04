import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import { deleteFromCloudinary } from "../../config/cloudinaryService.js";
import * as brandDb from "./brand.db.js";

const buildMediaData = (imageData) => ({
  url: imageData.url,
  publicId: imageData.publicId,
  mimeType: imageData.mimeType,
  width: imageData.width,
  height: imageData.height,
  bytes: imageData.bytes,
  format: imageData.format,
  isPrimary: true,
  sortOrder: 0,
});

// Deletes the brand's existing media rows and their Cloudinary assets.
// Cloudinary cleanup failures are logged, not thrown — the DB is the
// source of truth, and a stray orphaned asset is recoverable later.
const replaceMedia = async (brandId, imageData) => {
  const existing = await brandDb.findBrandById(brandId);
  const oldPublicIds = (existing?.media ?? []).map((m) => m.publicId);

  await brandDb.deleteBrandMedia(brandId);
  await brandDb.createBrandMedia(brandId, buildMediaData(imageData));

  await Promise.all(
    oldPublicIds.map((publicId) =>
      deleteFromCloudinary(publicId).catch((err) => {
        console.error(
          `Failed to delete old brand logo ${publicId} from Cloudinary:`,
          err,
        );
      }),
    ),
  );
};

export const createBrand = async (payload, imageData) => {
  const existingSlug = await brandDb.findBrandBySlug(payload.slug);
  if (existingSlug) {
    throw new ConflictError("Brand slug already exists");
  }

  const data = {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    isActive: payload.isActive ?? true,
    sortOrder: payload.sortOrder ?? 0,
  };

  const mediaData = imageData ? [buildMediaData(imageData)] : undefined;

  return brandDb.createBrand(data, mediaData);
};

export const getBrands = async (filters) => {
  const { page = 1, limit = 20, isActive, search } = filters;
  const { skip, take } = getPaginationParams(page, limit);

  const [brands, total] = await brandDb.findBrands({
    isActive,
    search,
    skip,
    take,
  });

  return {
    brands,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

export const getBrandById = async (id) => {
  const brand = await brandDb.findBrandById(id);
  if (!brand) throw new NotFoundError("Brand not found");
  return brand;
};

export const getBrandBySlug = async (slug) => {
  const brand = await brandDb.findBrandBySlug(slug);
  if (!brand) throw new NotFoundError("Brand not found");
  return brand;
};

export const updateBrand = async (id, payload, imageData) => {
  const brand = await brandDb.findBrandById(id);
  if (!brand) throw new NotFoundError("Brand not found");

  if (payload.slug && payload.slug !== brand.slug) {
    const existingSlug = await brandDb.findBrandBySlug(payload.slug);
    if (existingSlug && existingSlug.id !== id) {
      throw new ConflictError("Brand slug already exists");
    }
  }

  const data = {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    isActive: payload.isActive,
    sortOrder: payload.sortOrder,
  };

  Object.keys(data).forEach(
    (key) => data[key] === undefined && delete data[key],
  );

  if (imageData) {
    await replaceMedia(id, imageData);
  }

  return brandDb.updateBrand(id, data);
};

export const updateBrandLogo = async (id, imageData) => {
  const brand = await brandDb.findBrandById(id);
  if (!brand) throw new NotFoundError("Brand not found");

  await replaceMedia(id, imageData);

  return brandDb.findBrandById(id);
};

export const deleteBrand = async (id) => {
  const brand = await brandDb.findBrandById(id);
  if (!brand) throw new NotFoundError("Brand not found");

  if (brand.products && brand.products.length > 0) {
    throw new BadRequestError(
      "Cannot delete brand with existing products. Archive products first.",
    );
  }

  // Clean up Cloudinary assets before the cascade delete removes the
  // BrandMedia rows (onDelete: Cascade handles the DB side automatically).
  await Promise.all(
    (brand.media ?? []).map((m) =>
      deleteFromCloudinary(m.publicId).catch((err) => {
        console.error(
          `Failed to delete brand logo ${m.publicId} from Cloudinary:`,
          err,
        );
      }),
    ),
  );

  return brandDb.deleteBrand(id);
};
