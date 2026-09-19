import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { successResponse } from "../../lib/response.js";
import * as variantService from "./variant.service.js";

export const createVariant = asyncWrapper(async (req, res) => {
  const variant = await variantService.createVariant(req.body);

  return successResponse({
    res,
    statusCode: 201,
    message: "Variant created successfully",
    data: variant,
  });
});

export const getVariant = asyncWrapper(async (req, res) => {
  const variant = await variantService.getVariantById(req.params.id);

  return successResponse({
    res,
    message: "Variant fetched successfully",
    data: variant,
  });
});

export const getProductVariants = asyncWrapper(async (req, res) => {
  const variants = await variantService.getVariantsByProduct(
    req.params.productId,
    req.query,
  );

  return successResponse({
    res,
    message: "Product variants fetched successfully",
    data: variants,
  });
});

export const updateVariant = asyncWrapper(async (req, res) => {
  const { variant, publicIdsToPurge } = await variantService.updateVariant(
    req.params.id,
    req.body,
  );

  // CDN cleanup runs AFTER the service has committed any DB work.
  await variantService.purgeMedia(publicIdsToPurge);

  return successResponse({
    res,
    message: "Variant updated successfully",
    data: variant,
  });
});

export const updateVariantImages = asyncWrapper(async (req, res) => {
  const { variant, publicIdsToPurge } =
    await variantService.updateVariantImages(
      req.params.id,
      req.body.variantImages || [],
    );

  await variantService.purgeMedia(publicIdsToPurge);

  return successResponse({
    res,
    message: "Variant images updated successfully",
    data: variant,
  });
});

export const deleteVariant = asyncWrapper(async (req, res) => {
  const { publicIdsToPurge } = await variantService.deleteVariant(
    req.params.id,
  );

  await variantService.purgeMedia(publicIdsToPurge);

  return successResponse({
    res,
    message: "Variant deleted successfully",
    data: null,
  });
});

export const bulkCreateVariants = asyncWrapper(async (req, res) => {
  const variants = await variantService.bulkCreateVariants(
    req.params.productId,
    req.body.variants,
  );

  return successResponse({
    res,
    statusCode: 201,
    message: "Variants created successfully",
    data: variants,
  });
});

export const archiveVariant = asyncWrapper(async (req, res) => {
  const { reason } = req.body ?? {};
  const { publicIdsToPurge } = await variantService.archiveVariant(
    req.params.id,
    { reason, archivedBy: req.user?.id },
  );
  await variantService.purgeMedia(publicIdsToPurge);

  return successResponse({
    res,
    message: "Variant archived successfully",
    data: { archived: true },
  });
});

export const restoreVariant = asyncWrapper(async (req, res) => {
  const variant = await variantService.restoreVariant(req.params.id);
  return successResponse({
    res,
    message: "Variant restored successfully",
    data: variant,
  });
});
