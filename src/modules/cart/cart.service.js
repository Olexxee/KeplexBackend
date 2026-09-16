import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as cartDb from "./cart.db.js";
import * as variantDb from "../variants/variant.db.js";

// ============================================================
// HELPERS
// ============================================================

const toNumber = (value) => Number(value);

const toPositiveInteger = (value, field = "Quantity") => {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new BadRequestError(`${field} must be a positive integer`);
  }

  return number;
};

// ============================================================
// CART FORMATTER
// ============================================================

const formatCart = (cart) => {
  const items = cart?.items || [];

  const subtotal = items.reduce((sum, cartItem) => {
    return (
      sum + toNumber(cartItem.unitPriceSnapshot) * Number(cartItem.quantity)
    );
  }, 0);

  const totalWeight = items.reduce((sum, cartItem) => {
    const actualWeight =
      cartItem.variant?.actualWeight ?? cartItem.variant?.weight ?? 0;

    return sum + toNumber(actualWeight) * Number(cartItem.quantity);
  }, 0);

  return {
    id: cart.id,
    status: cart.status,
    userId: cart.userId,

    items: items.map((cartItem) => {
      const variant = cartItem.variant;

      const quantity = Number(cartItem.quantity);

      const unitPrice = toNumber(cartItem.unitPriceSnapshot);

      const stock = Number(variant?.stock || 0);

      return {
        id: cartItem.id,

        variantId: cartItem.variantId,

        quantity,

        unitPrice,

        lineTotal: unitPrice * quantity,

        variant: variant
          ? {
              id: variant.id,

              sku: variant.sku,

              color: variant.color,

              size: variant.size,

              price: Number(variant.price),

              weight: variant.weight != null ? Number(variant.weight) : null,

              actualWeight:
                variant.actualWeight != null
                  ? Number(variant.actualWeight)
                  : null,

              stock: variant.stock,

              isActive: variant.isActive,

              fulfillmentType: variant.fulfillmentType,

              shippingType: variant.shippingType,

              length: variant.length != null ? Number(variant.length) : null,

              width: variant.width != null ? Number(variant.width) : null,

              height: variant.height != null ? Number(variant.height) : null,

              // Product/variant CBM is retained only as
              // product data for display/reference.
              // Checkout shipping calculations must use
              // ShippingCalculator.
              cbm: variant.cbm != null ? Number(variant.cbm) : null,

              images: variant.media || [],

              product: variant.product
                ? {
                    id: variant.product.id,
                    name: variant.product.name,
                    slug: variant.product.slug,
                    brand: variant.product.brand,
                    category: variant.product.category,
                  }
                : null,
            }
          : null,

        availableStock: stock,

        inStock: Boolean(variant?.isActive) && stock >= quantity,

        unavailable: !variant || !variant.isActive,
      };
    }),

    subtotal: Number(subtotal.toFixed(2)),

    totalWeight: Number(totalWeight.toFixed(2)),

    totalItems: items.reduce(
      (sum, cartItem) => sum + Number(cartItem.quantity),
      0,
    ),

    createdAt: cart.createdAt,

    updatedAt: cart.updatedAt,
  };
};

// ============================================================
// ACTIVE CART
// ============================================================

const getOrCreateActiveCart = async (userId) => {
  const existingCart = await cartDb.findActiveCartByUserId(userId);

  if (existingCart) {
    return existingCart;
  }

  await cartDb.createCart(userId);

  return cartDb.findActiveCartByUserId(userId);
};

// ============================================================
// VARIANT VALIDATION
// ============================================================

const ensureVariantCanBeAdded = async ({ variantId, quantity }) => {
  const normalizedQuantity = toPositiveInteger(quantity);

  const variant = await variantDb.findVariantById(variantId);

  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  if (!variant.isActive) {
    throw new BadRequestError("This variant is not available");
  }

  if (Number(variant.stock) < normalizedQuantity) {
    throw new BadRequestError(
      `Insufficient stock. Available: ${variant.stock}`,
    );
  }

  return variant;
};

// ============================================================
// GET CART
// ============================================================

export const getCart = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);

  return formatCart(cart);
};

// ============================================================
// ADD ITEM
// ============================================================

export const addItemToCart = async (userId, payload) => {
  const variantId = payload?.variantId;

  if (!variantId) {
    throw new BadRequestError("Variant ID is required");
  }

  const quantity = toPositiveInteger(payload?.quantity ?? 1);

  const variant = await ensureVariantCanBeAdded({
    variantId,
    quantity,
  });

  const cart = await getOrCreateActiveCart(userId);

  const existingCartItem = await cartDb.findCartItem({
    cartId: cart.id,
    variantId,
  });

  if (existingCartItem) {
    const nextQuantity = Number(existingCartItem.quantity) + quantity;

    await ensureVariantCanBeAdded({
      variantId,
      quantity: nextQuantity,
    });

    await cartDb.updateCartItemQuantity({
      cartId: cart.id,
      variantId,
      quantity: nextQuantity,
    });
  } else {
    await cartDb.createCartItem({
      cartId: cart.id,
      variantId,
      quantity,
      unitPriceSnapshot: variant.price,
    });
  }

  const updatedCart = await cartDb.findActiveCartByUserId(userId);

  return formatCart(updatedCart);
};

// ============================================================
// UPDATE ITEM
// ============================================================

export const updateCartItem = async (userId, variantId, payload) => {
  const quantity = toPositiveInteger(payload?.quantity);

  await ensureVariantCanBeAdded({
    variantId,
    quantity,
  });

  const cart = await getOrCreateActiveCart(userId);

  const existingCartItem = await cartDb.findCartItem({
    cartId: cart.id,
    variantId,
  });

  if (!existingCartItem) {
    throw new NotFoundError("Cart item not found");
  }

  await cartDb.updateCartItemQuantity({
    cartId: cart.id,
    variantId,
    quantity,
  });

  const updatedCart = await cartDb.findActiveCartByUserId(userId);

  return formatCart(updatedCart);
};

// ============================================================
// REMOVE ITEM
// ============================================================

export const removeCartItem = async (userId, variantId) => {
  const cart = await getOrCreateActiveCart(userId);

  const existingCartItem = await cartDb.findCartItem({
    cartId: cart.id,
    variantId,
  });

  if (!existingCartItem) {
    throw new NotFoundError("Cart item not found");
  }

  await cartDb.deleteCartItem({
    cartId: cart.id,
    variantId,
  });

  const updatedCart = await cartDb.findActiveCartByUserId(userId);

  return formatCart(updatedCart);
};

// ============================================================
// CLEAR CART
// ============================================================

export const clearCart = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);

  await cartDb.clearCartItems(cart.id);

  const updatedCart = await cartDb.findActiveCartByUserId(userId);

  return formatCart(updatedCart);
};

// ============================================================
// CART SUMMARY
// ============================================================

export const getCartSummary = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);

  const formatted = formatCart(cart);

  return {
    ...formatted,

    shippingEstimate: null,

    taxEstimate: 0,

    grandTotal: formatted.subtotal,
  };
};

// ============================================================
// MERGE GUEST CART
// ============================================================

export const mergeCarts = async (userId, sessionId) => {
  if (!sessionId) {
    return getCart(userId);
  }

  const guestCart = await cartDb.findActiveCartBySessionId(sessionId);

  if (!guestCart) {
    return getCart(userId);
  }

  const userCart = await getOrCreateActiveCart(userId);

  await cartDb.mergeGuestCartIntoUserCart({
    guestCartId: guestCart.id,

    userCartId: userCart.id,

    items: guestCart.items,
  });

  const updatedCart = await cartDb.findActiveCartByUserId(userId);

  return formatCart(updatedCart);
};

// ============================================================
// CHECKOUT VALIDATION
// ============================================================

export const validateCartForCheckout = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);

  if (!cart.items || cart.items.length === 0) {
    throw new BadRequestError("Cart is empty");
  }

  const errors = [];

  const items = [];

  for (const cartItem of cart.items) {
    const quantity = Number(cartItem.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push({
        variantId: cartItem.variantId,
        error: "Invalid cart quantity",
      });

      continue;
    }

    const variant = await variantDb.findVariantById(cartItem.variantId);

    if (!variant) {
      errors.push({
        variantId: cartItem.variantId,
        error: "Variant is no longer available",
      });

      continue;
    }

    if (!variant.isActive) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        error: "Variant is no longer available",
      });

      continue;
    }

    if (Number(variant.stock) < quantity) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        available: variant.stock,
        requested: quantity,
        error: "Insufficient stock",
      });
    }

    if (
      cartItem.unitPriceSnapshot == null ||
      Number(cartItem.unitPriceSnapshot) <= 0
    ) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        error: "Invalid cart item price",
      });

      continue;
    }

    items.push({
      variantId: cartItem.variantId,

      quantity,

      // The cart snapshot is the price used for
      // this cart/order calculation.
      price: Number(cartItem.unitPriceSnapshot),

      total: Number(cartItem.unitPriceSnapshot) * quantity,

      variant,
    });
  }

  return {
    valid: errors.length === 0,

    errors,

    items,

    totalItems: cart.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    ),
  };
};
