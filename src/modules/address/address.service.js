import { prisma } from "../../config/prisma.js";
import * as db from "./address.db.js";

import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../classes/errorClasses.js";

const MAX_ADDRESSES = 3;

export const getMyAddresses = async (userId) => {
  return db.getAddressesByUser(userId);
};

export const create = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    const addressCount = await db.countAddressesByUser(userId, tx);

    if (addressCount >= MAX_ADDRESSES) {
      throw new BadRequestError(
        `You can save a maximum of ${MAX_ADDRESSES} addresses.`,
      );
    }

    const isFirstAddress = addressCount === 0;

    const shouldBeDefault = isFirstAddress || payload.isDefault === true;

    if (shouldBeDefault) {
      await db.clearDefaultAddresses(userId, tx);
    }

    return db.createAddress(
      {
        ...payload,
        userId,
        isDefault: shouldBeDefault,
      },
      tx,
    );
  });
};

export const update = async (userId, id, payload) => {
  return prisma.$transaction(async (tx) => {
    const address = await db.findAddressByUser(userId, id, tx);

    if (!address) {
      throw new ForbiddenError("Not allowed");
    }

    if (payload.isDefault === true) {
      await db.clearDefaultAddresses(userId, tx);
    }

    return db.updateAddress(id, payload, tx);
  });
};

export const setDefault = async (userId, id) => {
  return prisma.$transaction(async (tx) => {
    const address = await db.findAddressByUser(userId, id, tx);

    if (!address) {
      throw new NotFoundError("Address not found");
    }

    await db.clearDefaultAddresses(userId, tx);

    return db.updateAddress(
      id,
      {
        isDefault: true,
      },
      tx,
    );
  });
};

export const remove = async (userId, id) => {
  return prisma.$transaction(async (tx) => {
    const address = await db.findAddressByUser(userId, id, tx);

    if (!address) {
      throw new ForbiddenError("Not allowed");
    }

    await db.deleteAddress(id, tx);

    if (address.isDefault) {
      const remainingAddresses = await db.getAddressesByUser(userId, tx);

      if (remainingAddresses.length > 0) {
        await db.updateAddress(
          remainingAddresses[0].id,
          {
            isDefault: true,
          },
          tx,
        );
      }
    }

    return true;
  });
};
