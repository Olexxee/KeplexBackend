// modules/cart/cart.service.js
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as cartDb from "./cart.db.js";
import * as variantDb from "../variants/variant.db.js";
import { CBMCalculator } from "../shipping/cbm.calculator.js";

const toNumber = (value) => Number(value);

const formatCart = (cart) => {
  const items = cart.items || [];

  // Calculate subtotal and totals
  const subtotal = items.reduce((sum, cartItem) => {
    return sum + toNumber(cartItem.unitPriceSnapshot) * cartItem.quantity;
  }, 0);

  // Calculate total weight
  const totalWeight = items.reduce((sum, cartItem) => {
    const weight = cartItem.variant?.weight || 0;
    return sum + toNumber(weight) * cartItem.quantity;
  }, 0);

  // Calculate total CBM
  let totalCBM = 0;
  const cbmItems = [];

  for (const cartItem of items) {
    const variant = cartItem.variant;
    if (variant?.length && variant?.width && variant?.height) {
      const cbm =
        CBMCalculator.calculateCBM({
          length: Number(variant.length),
          width: Number(variant.width),
          height: Number(variant.height),
        }) * cartItem.quantity;

      totalCBM += cbm;

      cbmItems.push({
        variantId: variant.id,
        sku: variant.sku,
        productName: variant.product?.name || "Unknown",
        cbm: parseFloat(cbm.toFixed(4)),
        quantity: cartItem.quantity,
      });
    }
  }

  return {
    id: cart.id,
    status: cart.status,
    userId: cart.userId,
    items: items.map((cartItem) => {
      const { variant } = cartItem;
      const currentPrice = toNumber(cartItem.unitPriceSnapshot);
      const stock = variant?.stock || 0;

      return {
        id: cartItem.id,
        variantId: cartItem.variantId,
        quantity: cartItem.quantity,
        unitPrice: currentPrice,
        lineTotal: currentPrice * cartItem.quantity,
        variant: variant
          ? {
              id: variant.id,
              sku: variant.sku,
              color: variant.color,
              size: variant.size,
              price: Number(variant.price),
              weight: Number(variant.weight),
              stock: variant.stock,
              isActive: variant.isActive,
              fulfillmentType: variant.fulfillmentType,
              shippingType: variant.shippingType,
              // CBM dimensions
              length: variant.length ? Number(variant.length) : null,
              width: variant.width ? Number(variant.width) : null,
              height: variant.height ? Number(variant.height) : null,
              cbm: variant.cbm ? Number(variant.cbm) : null,
              actualWeight: variant.actualWeight
                ? Number(variant.actualWeight)
                : null,
              images: variant.images || [],
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
        inStock: stock >= cartItem.quantity,
        unavailable: !variant || !variant.isActive,
      };
    }),
    subtotal,
    totalWeight: parseFloat(totalWeight.toFixed(2)),
    totalCBM: parseFloat(totalCBM.toFixed(4)),
    cbmItems,
    totalItems: items.reduce((sum, cartItem) => sum + cartItem.quantity, 0),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

const getOrCreateActiveCart = async (userId) => {
  const existingCart = await cartDb.findActiveCartByUserId(userId);
  if (existingCart) return existingCart;

  await cartDb.createCart(userId);
  return cartDb.findActiveCartByUserId(userId);
};

const ensureVariantCanBeAdded = async ({ variantId, quantity }) => {
  const variant = await variantDb.findVariantById(variantId);

  if (!variant) {
    throw new NotFoundError("Variant not found");
  }

  if (!variant.isActive) {
    throw new BadRequestError("This variant is not available");
  }

  if (variant.stock < quantity) {
    throw new BadRequestError(
      `Insufficient stock. Available: ${variant.stock}`,
    );
  }

  return variant;
};

export const getCart = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);
  return formatCart(cart);
};

export const addItemToCart = async (userId, payload) => {
  const { variantId, quantity = 1 } = payload;

  // Validate variant and stock
  const variant = await ensureVariantCanBeAdded({ variantId, quantity });

  // Get or create active cart
  const cart = await getOrCreateActiveCart(userId);

  // Check if variant already in cart
  const existingCartItem = await cartDb.findCartItem({
    cartId: cart.id,
    variantId,
  });

  if (existingCartItem) {
    const nextQuantity = existingCartItem.quantity + quantity;
    await ensureVariantCanBeAdded({ variantId, quantity: nextQuantity });

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

export const updateCartItem = async (userId, variantId, payload) => {
  const { quantity } = payload;

  if (quantity <= 0) {
    throw new BadRequestError("Quantity must be greater than 0");
  }

  await ensureVariantCanBeAdded({ variantId, quantity });

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

export const clearCart = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);
  await cartDb.clearCartItems(cart.id);

  const updatedCart = await cartDb.findActiveCartByUserId(userId);
  return formatCart(updatedCart);
};

export const getCartSummary = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);
  const formatted = formatCart(cart);

  // Calculate shipping estimate (will be used in checkout)
  return {
    ...formatted,
    shippingEstimate: null, // Will be calculated by shipping service
    taxEstimate: 0, // Will be calculated by tax service
    grandTotal: formatted.subtotal, // Will include shipping and tax
  };
};

export const mergeCarts = async (userId, sessionId) => {
  // Merge guest cart with user cart
  const guestCart = await prisma.cart.findFirst({
    where: {
      sessionId,
      status: "ACTIVE",
    },
    include: {
      items: true,
    },
  });

  if (!guestCart) {
    return getCart(userId);
  }

  const userCart = await getOrCreateActiveCart(userId);

  // Move guest cart items to user cart
  for (const guestItem of guestCart.items) {
    const existingItem = await cartDb.findCartItem({
      cartId: userCart.id,
      variantId: guestItem.variantId,
    });

    if (existingItem) {
      await cartDb.updateCartItemQuantity({
        cartId: userCart.id,
        variantId: guestItem.variantId,
        quantity: existingItem.quantity + guestItem.quantity,
      });
    } else {
      await cartDb.createCartItem({
        cartId: userCart.id,
        variantId: guestItem.variantId,
        quantity: guestItem.quantity,
        unitPriceSnapshot: guestItem.unitPriceSnapshot,
      });
    }
  }

  // Delete guest cart
  await prisma.cart.delete({
    where: { id: guestCart.id },
  });

  const updatedCart = await cartDb.findActiveCartByUserId(userId);
  return formatCart(updatedCart);
};

export const validateCartForCheckout = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);

  if (!cart.items || cart.items.length === 0) {
    throw new BadRequestError("Cart is empty");
  }

  const errors = [];
  const items = [];

  for (const cartItem of cart.items) {
    const variant = await variantDb.findVariantById(cartItem.variantId);

    if (!variant || !variant.isActive) {
      errors.push({
        variantId: cartItem.variantId,
        error: "Variant is no longer available",
      });
      continue;
    }

    if (variant.stock < cartItem.quantity) {
      errors.push({
        variantId: cartItem.variantId,
        sku: variant.sku,
        available: variant.stock,
        requested: cartItem.quantity,
        error: "Insufficient stock",
      });
    }

    items.push({
      variantId: cartItem.variantId,
      quantity: cartItem.quantity,
      price: Number(variant.price),
      total: Number(variant.price) * cartItem.quantity,
      variant,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    items,
    totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
  };
};
