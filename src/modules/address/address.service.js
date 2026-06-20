import * as db from "./address.db.js";
import { ForbiddenError, NotFoundError } from "../../classes/errorClasses.js";

export const getMyAddresses = async (userId) => {
  return db.getAddressesByUser(userId);
};

export const create = async (userId, payload) => {
  if (payload.isDefault) {
    await db.clearDefaultAddresses(userId);
  }

  return db.createAddress({
    ...payload,
    userId,
  });
};

export const update = async (userId, id, payload) => {
  const addresses = await db.getAddressesByUser(userId);

  const address = addresses.find((a) => a.id === id);

  if (!address) {
    throw new ForbiddenError("Not allowed");
  }

  if (payload.isDefault) {
    await db.clearDefaultAddresses(userId);
  }

  return db.updateAddress(id, payload);
};

export const setDefault = async (userId, id) => {
  const addresses = await db.getAddressesByUser(userId);

  const address = addresses.find((a) => a.id === id);

  if (!address) {
    throw new NotFoundError("Address not found");
  }

  await db.clearDefaultAddresses(userId);

  return db.updateAddress(id, {
    isDefault: true,
  });
};

export const remove = async (userId, id) => {
  const addresses = await db.getAddressesByUser(userId);

  const owns = addresses.some((a) => a.id === id);

  if (!owns) throw new ForbiddenError("Not allowed");

  return db.deleteAddress(id);
};
