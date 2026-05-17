import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";

import * as testimonialDb from "./testimonial.db.js";

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase();
};

export const createTestimonial = async ({
  name,
  role,
  message,
  rating,
  imageUrl,
}) => {
  if (!name || !message) {
    throw new BadRequestError("Name and message are required");
  }

  return testimonialDb.createTestimonial({
    name: name.trim(),
    role: role?.trim() || null,
    message: message.trim(),
    rating: Number(rating) || 5,
    imageUrl: imageUrl || null,
    status: "PENDING",
  });
};

export const getPublicTestimonials = async () => {
  return testimonialDb.listPublicTestimonials();
};

export const getAdminTestimonials = async (query) => {
  return testimonialDb.listAdminTestimonials(query);
};

export const getTestimonialStats = async () => {
  return testimonialDb.getTestimonialStats();
};

export const updateTestimonialStatus = async ({ id, status }) => {
  const normalizedStatus = normalizeStatus(status);

  const allowedStatuses = ["APPROVED", "REJECTED", "PENDING"];

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new BadRequestError("Invalid testimonial status");
  }

  const testimonial = await testimonialDb.findTestimonialById(id);

  if (!testimonial) {
    throw new NotFoundError("Testimonial not found");
  }

  return testimonialDb.updateTestimonialById(id, {
    status: normalizedStatus,
  });
};

export const deleteTestimonial = async (id) => {
  const testimonial = await testimonialDb.findTestimonialById(id);

  if (!testimonial) {
    throw new NotFoundError("Testimonial not found");
  }

  return testimonialDb.deleteTestimonialById(id);
};
