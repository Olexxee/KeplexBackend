import * as db from "./address.db.js";
import { ForbiddenError } from "../../classes/errorClasses.js";

export const getMyAddresses = async (userId) => {
  return db.getAddressesByUser(userId);
};

export const create = async (userId, payload) => {
  return db.createAddress({
    ...payload,
    userId,
  });
};

export const update = async (userId, id, payload) => {
  const addresses = await db.getAddressesByUser(userId);

  const owns = addresses.some((a) => a.id === id);

  if (!owns) throw new ForbiddenError("Not allowed");

  return db.updateAddress(id, payload);
};

export const remove = async (userId, id) => {
  const addresses = await db.getAddressesByUser(userId);

  const owns = addresses.some((a) => a.id === id);

  if (!owns) throw new ForbiddenError("Not allowed");

  return db.deleteAddress(id);
};
