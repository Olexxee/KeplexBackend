import * as shippingService from "./shipping.service.js";

// ============================================================
// CONFIGURATION
// ============================================================

export const createShippingConfig = async (
  req,
  res,
) => {
  const config =
    await shippingService.createShippingConfig(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Shipping configuration created successfully",
    data: config,
  });
};

export const updateShippingConfig = async (
  req,
  res,
) => {
  const config =
    await shippingService.updateShippingConfig(
      req.params.id,
      req.body,
    );

  res.json({
    success: true,
    message:
      "Shipping configuration updated successfully",
    data: config,
  });
};

export const getShippingConfig = async (
  req,
  res,
) => {
  const config =
    await shippingService.getShippingConfig(
      req.params.id,
    );

  res.json({
    success: true,
    data: config,
  });
};

export const getShippingConfigs = async (
  req,
  res,
) => {
  const configs =
    await shippingService.getShippingConfigs();

  res.json({
    success: true,
    data: configs,
  });
};

export const getActiveShippingConfig = async (
  req,
  res,
) => {
  const config =
    await shippingService.getActiveShippingConfig();

  res.json({
    success: true,
    data: config,
  });
};

// ============================================================
// RULES
// ============================================================

export const createShippingRule = async (
  req,
  res,
) => {
  const rule =
    await shippingService.createShippingRule(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Shipping rule created successfully",
    data: rule,
  });
};

export const updateShippingRule = async (
  req,
  res,
) => {
  const rule =
    await shippingService.updateShippingRule(
      req.params.id,
      req.body,
    );

  res.json({
    success: true,
    message:
      "Shipping rule updated successfully",
    data: rule,
  });
};

export const getShippingRule = async (
  req,
  res,
) => {
  const rule =
    await shippingService.getShippingRule(
      req.params.id,
    );

  res.json({
    success: true,
    data: rule,
  });
};

export const getShippingRules = async (
  req,
  res,
) => {
  const rules =
    await shippingService.getShippingRules(
      req.query,
    );

  res.json({
    success: true,
    data: rules,
  });
};

export const deleteShippingRule = async (
  req,
  res,
) => {
  await shippingService.deleteShippingRule(
    req.params.id,
  );

  res.json({
    success: true,
    message:
      "Shipping rule deleted successfully",
  });
};

// ============================================================
// QUOTE
// ============================================================

export const calculateShippingQuote = async (
  req,
  res,
) => {
  const quote =
    await shippingService.calculateShippingQuote(
      req.body,
    );

  res.json({
    success: true,
    data: quote,
  });
};

// ============================================================
// VARIANT CBM
// ============================================================

export const calculateCBMForVariant = async (
  req,
  res,
) => {
  const result =
    shippingService.calculateCBMForVariant(
      req.body,
    );

  res.json({
    success: true,
    data: result,
  });
};

// ============================================================
// ORDER CBM
// ============================================================

export const updateOrderWithCBM = async (
  req,
  res,
) => {
  const result =
    await shippingService.updateOrderWithCBM({
      orderId: req.body.orderId,
      items: req.body.items,
      updatedBy: req.user?.id || null,
    });

  res.json({
    success: true,
    message:
      "Order shipping metrics updated successfully",
    data: result,
  });
};
