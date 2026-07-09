// modules/variants/variant.service.js
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../../classes/errorClasses.js";
import { SKUGenerator } from "./sku.generator.js";
import * as variantDb from "./variant.db.js";
import * as productDb from "../products/product.db.js";
import { CBMCalculator } from "../shipping/cbm.calculator.js";

export const createVariant = async (payload) => {
  const { productId, ...variantData } = payload;

  // Check if product exists
  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  // Generate SKU if not provided
  if (!variantData.sku) {
    variantData.sku = await SKUGenerator.generateSKU({
      productName: product.name,
      categoryId: product.categoryId,
      color: variantData.color,
      size: variantData.size,
    });
  } else {
    // Check SKU uniqueness
    const existing = await variantDb.findVariantBySKU(variantData.sku);
    if (existing) {
      throw new ConflictError("SKU already exists");
    }
  }

  // Validate CBM dimensions
  if (variantData.length && variantData.width && variantData.height) {
    const cbm = CBMCalculator.calculateCBM({
      length: variantData.length,
      width: variantData.width,
      height: variantData.height,
    });
    variantData.cbm = cbm;
  }

  // Calculate volumetric weight
  if (variantData.cbm && variantData.actualWeight) {
    variantData.volumetricWeight = CBMCalculator.calculateVolumetricWeight(
      variantData.cbm,
      variantData.shippingType || "SEA",
    );
    variantData.chargeableWeight = CBMCalculator.calculateChargeableWeight(
      variantData.actualWeight,
      variantData.cbm,
      variantData.shippingType || "SEA",
    );
  }

  return variantDb.createVariant({
    ...variantData,
    productId,
  });
};

export const updateVariant = async (id, payload) => {
  const variant = await variantDb.findVariantById(id);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  // Recalculate CBM if dimensions changed
  if (payload.length || payload.width || payload.height) {
    const length = payload.length || variant.length;
    const width = payload.width || variant.width;
    const height = payload.height || variant.height;

    if (length && width && height) {
      const cbm = CBMCalculator.calculateCBM({ length, width, height });
      payload.cbm = cbm;

      // Recalculate volumetric weight
      const actualWeight = payload.actualWeight || variant.actualWeight;
      const shippingType =
        payload.shippingType || variant.shippingType || "SEA";

      if (actualWeight) {
        payload.volumetricWeight = CBMCalculator.calculateVolumetricWeight(
          cbm,
          shippingType,
        );
        payload.chargeableWeight = CBMCalculator.calculateChargeableWeight(
          actualWeight,
          cbm,
          shippingType,
        );
      }
    }
  }

  return variantDb.updateVariant(id, payload);
};

export const getVariantById = async (id) => {
  const variant = await variantDb.findVariantById(id);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }
  return variant;
};

export const getVariantsByProduct = async (productId, filters = {}) => {
  return variantDb.findVariantsByProduct(productId, filters);
};

export const deleteVariant = async (id) => {
  const variant = await variantDb.findVariantById(id);
  if (!variant) {
    throw new NotFoundError("Variant not found");
  }
  return variantDb.deleteVariant(id);
};

export const bulkCreateVariants = async (productId, variantsData) => {
  const product = await productDb.findProductById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const variants = [];
  for (const data of variantsData) {
    // Generate SKU if not provided
    if (!data.sku) {
      data.sku = await SKUGenerator.generateSKU({
        productName: product.name,
        categoryId: product.categoryId,
        color: data.color,
        size: data.size,
      });
    }

    // Calculate CBM
    if (data.length && data.width && data.height) {
      data.cbm = CBMCalculator.calculateCBM({
        length: data.length,
        width: data.width,
        height: data.height,
      });
    }

    variants.push({
      ...data,
      productId,
    });
  }

  return variantDb.bulkCreateVariants(variants);
};
