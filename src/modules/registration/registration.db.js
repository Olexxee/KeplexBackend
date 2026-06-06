import { prisma } from "../../config/prisma.js";

export const createRegistration = async (data) => {
  return prisma.trainingEnrollment.create({
    data,
    include: {
      trainingProgram: true,
    },
  });
};

export const findRegistrationById = async (id) => {
  return prisma.trainingEnrollment.findUnique({
    where: { id },
    include: {
      trainingProgram: true,
    },
  });
};

export const findRegistrationByEmailAndProgram = async (
  email,
  trainingProgramId,
) => {
  return prisma.trainingEnrollment.findUnique({
    where: {
      trainingProgramId_email: {
        trainingProgramId,
        email,
      },
    },
  });
};

export const findRegistrationByPaymentRef = async (paymentRef) => {
  return prisma.trainingEnrollment.findUnique({
    where: { paymentRef },
    include: {
      trainingProgram: true,
    },
  });
};

export const updateRegistrationById = async (id, data) => {
  return prisma.trainingEnrollment.update({
    where: { id },
    data,
    include: {
      trainingProgram: true,
    },
  });
};

export const listRegistrations = async ({
  status,
  trainingProgramId,
  skip,
  take,
} = {}) => {
  const where = {
    ...(status && { status }),
    ...(trainingProgramId && { trainingProgramId }),
  };

  return Promise.all([
    prisma.trainingEnrollment.findMany({
      where,
      skip,
      take,
      include: {
        trainingProgram: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trainingEnrollment.count({ where }),
  ]);
};

export const getRegistrationStats = async () => {
  const [total, paid, pending, cancelled] = await Promise.all([
    prisma.trainingEnrollment.count(),
    prisma.trainingEnrollment.count({ where: { status: "PAID" } }),
    prisma.trainingEnrollment.count({ where: { status: "PENDING" } }),
    prisma.trainingEnrollment.count({ where: { status: "CANCELLED" } }),
  ]);

  return { total, paid, pending, cancelled };
};
