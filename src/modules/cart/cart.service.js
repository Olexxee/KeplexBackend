import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";

import * as cartDb from "./cart.db.js";
import * as itemDb from "../item/item.db.js";

const toNumber = (value) => Number(value);

const formatCart = (cart) => {
  const items = cart.items || [];

  const subtotal = items.reduce((sum, cartItem) => {
    return sum + toNumber(cartItem.unitPriceSnapshot) * cartItem.quantity;
  }, 0);

  return {
    id: cart.id,
    status: cart.status,
    userId: cart.userId,
    items: items.map((cartItem) => ({
      id: cartItem.id,
      itemId: cartItem.itemId,
      quantity: cartItem.quantity,
      unitPriceSnapshot: toNumber(cartItem.unitPriceSnapshot),
      lineTotal: toNumber(cartItem.unitPriceSnapshot) * cartItem.quantity,
      item: cartItem.item,
    })),
    subtotal,
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

const ensureItemCanBeAdded = async ({ itemId, quantity }) => {
  const item = await itemDb.findItemById(itemId);

  if (!item) {
    throw new NotFoundError("Item not found");
  }

  if (item.status !== "ACTIVE") {
    throw new BadRequestError("Item is not available");
  }

  if (item.itemType === "PRODUCT" && item.stock < quantity) {
    throw new BadRequestError("Insufficient stock");
  }

  return item;
};

export const getCart = async (userId) => {
  const cart = await getOrCreateActiveCart(userId);

  return formatCart(cart);
};

export const addItemToCart = async (userId, payload) => {
  const { itemId, quantity } = payload;

  const item = await ensureItemCanBeAdded({ itemId, quantity });

  const cart = await getOrCreateActiveCart(userId);

  const existingCartItem = await cartDb.findCartItem({
    cartId: cart.id,
    itemId,
  });

  if (existingCartItem) {
    const nextQuantity = existingCartItem.quantity + quantity;

    await ensureItemCanBeAdded({ itemId, quantity: nextQuantity });

    await cartDb.updateCartItemQuantity({
      cartId: cart.id,
      itemId,
      quantity: nextQuantity,
    });
  } else {
    await cartDb.createCartItem({
      cartId: cart.id,
      itemId,
      quantity,
      unitPriceSnapshot: item.price,
    });
  }

  const updatedCart = await cartDb.findActiveCartByUserId(userId);

  return formatCart(updatedCart);
};

export const updateCartItem = async (userId, itemId, payload) => {
  const { quantity } = payload;

  await ensureItemCanBeAdded({ itemId, quantity });

  const cart = await getOrCreateActiveCart(userId);

  const existingCartItem = await cartDb.findCartItem({
    cartId: cart.id,
    itemId,
  });

  if (!existingCartItem) {
    throw new NotFoundError("Cart item not found");
  }

  await cartDb.updateCartItemQuantity({
    cartId: cart.id,
    itemId,
    quantity,
  });

  const updatedCart = await cartDb.findActiveCartByUserId(userId);

  return formatCart(updatedCart);
};

export const removeCartItem = async (userId, itemId) => {
  const cart = await getOrCreateActiveCart(userId);

  const existingCartItem = await cartDb.findCartItem({
    cartId: cart.id,
    itemId,
  });

  if (!existingCartItem) {
    throw new NotFoundError("Cart item not found");
  }

  await cartDb.deleteCartItem({
    cartId: cart.id,
    itemId,
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
