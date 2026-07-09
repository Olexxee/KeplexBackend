// modules/brands/brand.service.js
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import {
  getPaginationParams,
  buildPaginationMeta,
} from "../../lib/pagination.js";
import * as brandDb from "./brand.db.js";

export const createBrand = async (payload) => {
  const existingSlug = await brandDb.findBrandBySlug(payload.slug);
  if (existingSlug) {
    throw new ConflictError("Brand slug already exists");
  }

  return brandDb.createBrand(payload);
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
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};

export const getBrandById = async (id) => {
  const brand = await brandDb.findBrandById(id);
  if (!brand) {
    throw new NotFoundError("Brand not found");
  }
  return brand;
};

export const getBrandBySlug = async (slug) => {
  const brand = await brandDb.findBrandBySlug(slug);
  if (!brand) {
    throw new NotFoundError("Brand not found");
  }
  return brand;
};

export const updateBrand = async (id, payload) => {
  const brand = await brandDb.findBrandById(id);
  if (!brand) {
    throw new NotFoundError("Brand not found");
  }

  if (payload.slug && payload.slug !== brand.slug) {
    const existingSlug = await brandDb.findBrandBySlug(payload.slug);
    if (existingSlug && existingSlug.id !== id) {
      throw new ConflictError("Brand slug already exists");
    }
  }

  return brandDb.updateBrand(id, payload);
};

export const deleteBrand = async (id) => {
  const brand = await brandDb.findBrandById(id);
  if (!brand) {
    throw new NotFoundError("Brand not found");
  }

  // Check if brand has products
  if (brand.products && brand.products.length > 0) {
    throw new BadRequestError(
      "Cannot delete brand with existing products. Archive products first.",
    );
  }

  return brandDb.deleteBrand(id);
};
