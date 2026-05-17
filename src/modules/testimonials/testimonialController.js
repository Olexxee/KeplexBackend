import { asyncWrapper } from "../../lib/asyncWrapper.js";

import * as testimonialService from "./testimonial.service.js";

export const createTestimonial = asyncWrapper(async (req, res) => {
  const result = await testimonialService.createTestimonial(req.body);

  return res.status(201).json({
    success: true,
    message: "Testimonial submitted successfully",
    data: result,
  });
});

export const getPublicTestimonials = asyncWrapper(async (req, res) => {
  const result = await testimonialService.getPublicTestimonials();

  return res.status(200).json({
    success: true,
    data: result,
  });
});

export const getAdminTestimonials = asyncWrapper(async (req, res) => {
  const result = await testimonialService.getAdminTestimonials(req.query);

  return res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
});

export const getTestimonialStats = asyncWrapper(async (req, res) => {
  const result = await testimonialService.getTestimonialStats();

  return res.status(200).json({
    success: true,
    data: result,
  });
});

export const updateTestimonialStatus = asyncWrapper(async (req, res) => {
  const result = await testimonialService.updateTestimonialStatus({
    id: req.params.id,
    status: req.body.status,
  });

  return res.status(200).json({
    success: true,
    message: "Testimonial updated successfully",
    data: result,
  });
});

export const deleteTestimonial = asyncWrapper(async (req, res) => {
  await testimonialService.deleteTestimonial(req.params.id);

  return res.status(200).json({
    success: true,
    message: "Testimonial deleted successfully",
  });
});
