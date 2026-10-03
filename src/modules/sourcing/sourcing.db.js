import { prisma } from "../../config/prisma.js";

const db = (tx) => tx ?? prisma;

const productReferenceInclude = {
  select: {
    id: true,
    name: true,
    slug: true,
    status: true,
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
    brand: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
    variants: {
      where: {
        isActive: true,
      },
      select: {
        id: true,
        sku: true,
        color: true,
        size: true,
        price: true,
        stock: true,
        isActive: true,
        media: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    },
  },
};

const responseInclude = {
  product: productReferenceInclude,

  variant: {
    select: {
      id: true,
      sku: true,
      color: true,
      size: true,
      price: true,
      stock: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      media: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
    },
  },
};

const requestInclude = {
  responses: {
    include: responseInclude,
    orderBy: {
      createdAt: "desc",
    },
  },
};

export const createSourcingRequest = (data, tx = null) =>
  db(tx).sourcingRequest.create({
    data,
    include: requestInclude,
  });

export const findSourcingRequestById = (id, tx = null) =>
  db(tx).sourcingRequest.findUnique({
    where: { id },
    include: {
      ...requestInclude,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

export const findSourcingRequestByNumber = (requestNumber, tx = null) =>
  db(tx).sourcingRequest.findUnique({
    where: { requestNumber },
    include: requestInclude,
  });

export const findUserSourcingRequestById = (userId, requestId, tx = null) =>
  db(tx).sourcingRequest.findFirst({
    where: {
      id: requestId,
      userId,
    },
    include: requestInclude,
  });

export const findSourcingRequestsByUserId = (
  userId,
  { status, skip = 0, take = 20 } = {},
  tx = null,
) =>
  db(tx).sourcingRequest.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    include: requestInclude,
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take,
  });

export const countSourcingRequestsByUserId = (
  userId,
  { status } = {},
  tx = null,
) =>
  db(tx).sourcingRequest.count({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
  });

export const findAllSourcingRequests = (
  { status, skip = 0, take = 20 } = {},
  tx = null,
) =>
  db(tx).sourcingRequest.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    include: {
      ...requestInclude,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take,
  });

export const countSourcingRequests = ({ status } = {}, tx = null) =>
  db(tx).sourcingRequest.count({
    where: {
      ...(status ? { status } : {}),
    },
  });

export const updateSourcingRequest = (id, data, tx = null) =>
  db(tx).sourcingRequest.update({
    where: { id },
    data,
    include: requestInclude,
  });

export const createSourcingResponse = (data, tx = null) =>
  db(tx).sourcingResponse.create({
    data,
    include: responseInclude,
  });

export const findSourcingResponseById = (id, tx = null) =>
  db(tx).sourcingResponse.findUnique({
    where: { id },
    include: {
      ...responseInclude,
      request: {
        select: {
          id: true,
          requestNumber: true,
          userId: true,
          title: true,
          status: true,
        },
      },
    },
  });

export const updateSourcingResponse = (id, data, tx = null) =>
  db(tx).sourcingResponse.update({
    where: { id },
    data,
    include: responseInclude,
  });
