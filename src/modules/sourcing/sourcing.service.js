import { ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import { prisma } from "../../config/prisma.js";

import * as aiService from "../ai/ai.service.js";
import * as sourcingDb from "./sourcing.db.js";
import * as sourcingMatcher from "./sourcing.matcher.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const generateRequestNumber = () =>
  `SRC-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

const buildAIInput = (payload) => ({
  text: [payload.title, payload.description].filter(Boolean).join("\n\n"),

  imageUrls: (payload.referenceImages || [])
    .map((image) => image.url)
    .filter(Boolean),
});

const AI_CONFIDENCE_THRESHOLD = 0.75;
const CATALOG_MATCH_THRESHOLD = 0.7;

const isTerminalRequest = (status) =>
  ["CANCELLED", "DECLINED", "COMPLETED"].includes(status);

/* ------------------------------------------------------------------ */
/* Create                                                             */
/* ------------------------------------------------------------------ */

export const createSourcingRequest = async (userId, payload) => {
  /*
   * AI failure must not block request creation. If the provider is
   * down, we still accept the request and let admins triage manually.
   */
  let aiAnalysis = null;
  try {
    aiAnalysis = await aiService.identifyProduct(buildAIInput(payload));
  } catch (error) {
    console.error("AI identification failed:", error);
  }

  const catalogMatch = aiAnalysis
    ? await sourcingMatcher.findBestCatalogMatch(aiAnalysis)
    : null;

  if (
    aiAnalysis?.confidence >= AI_CONFIDENCE_THRESHOLD &&
    catalogMatch &&
    catalogMatch.score >= CATALOG_MATCH_THRESHOLD
  ) {
    return {
      type: "CATALOG_MATCH",
      analysis: aiAnalysis,
      match: catalogMatch,
    };
  }

  const request = await sourcingDb.createSourcingRequest({
    requestNumber: generateRequestNumber(),
    userId,

    title: payload.title,
    description: payload.description || null,
    referenceUrl: payload.referenceUrl || null,
    referenceImages: payload.referenceImages || [],

    status: "SUBMITTED",

    aiAnalysis,
  });

  return {
    type: "SOURCING_REQUEST",
    analysis: aiAnalysis,
    request,
  };
};

/* ------------------------------------------------------------------ */
/* Read                                                               */
/* ------------------------------------------------------------------ */

export const getUserSourcingRequests = async (userId, options) => {
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 20);
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    sourcingDb.findSourcingRequestsByUserId(userId, {
      status: options.status,
      skip,
      take: limit,
    }),

    sourcingDb.countSourcingRequestsByUserId(userId, {
      status: options.status,
    }),
  ]);

  return {
    requests,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/*
 * Admin detail view.
 *
 * findSourcingRequestById already includes `user: { id, fullName, email, phone }`,
 * which is exactly what the admin detail page needs — there is no separate
 * "admin" shape to fetch.
 */
export const getAdminSourcingRequest = async (requestId) => {
  const request = await sourcingDb.findSourcingRequestById(requestId);

  if (!request) {
    throw new NotFoundError("Sourcing request not found");
  }

  return request;
};

export const getUserSourcingRequest = async (userId, requestId) => {
  const request = await sourcingDb.findUserSourcingRequestById(
    userId,
    requestId,
  );

  if (!request) {
    throw new NotFoundError("Sourcing request not found");
  }

  return request;
};

export const getAdminSourcingRequests = async (options) => {
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 20);
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    sourcingDb.findAllSourcingRequests({
      status: options.status,
      skip,
      take: limit,
    }),

    sourcingDb.countSourcingRequests({
      status: options.status,
    }),
  ]);

  return {
    requests,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/* ------------------------------------------------------------------ */
/* Update                                                             */
/* ------------------------------------------------------------------ */

export const updateSourcingRequestStatus = async (requestId, status) => {
  const existing = await sourcingDb.findSourcingRequestById(requestId);

  if (!existing) {
    throw new NotFoundError("Sourcing request not found");
  }

  return sourcingDb.updateSourcingRequest(requestId, { status });
};

/*
 * Design B — link an existing product to a sourcing request.
 *
 * The frontend creates the sourced product via the product pipeline
 * (image uploads, variants, etc.), then sends { productId, variantId }
 * here. Our job is to:
 *
 *   1. Guard against terminal requests (race-safe: re-read inside tx)
 *   2. Verify the product + variant exist and belong together
 *   3. Create the sourcing response
 *   4. Flip the request status to RESPONDED
 *
 * The product's own status is left untouched. If the admin created it
 * as DRAFT, it stays DRAFT until they publish it — that's their call,
 * not ours.
 */
export const respondToSourcingRequest = async (requestId, payload) => {
  return prisma.$transaction(async (tx) => {
    /*
     * Re-read inside the transaction so two concurrent responders
     * can't both pass the terminal-status check.
     */
    const request = await sourcingDb.findSourcingRequestById(requestId, tx);

    if (!request) {
      throw new NotFoundError("Sourcing request not found");
    }

    if (isTerminalRequest(request.status)) {
      throw new ConflictError(
        `Cannot respond to a sourcing request with status ${request.status}`,
      );
    }

    /*
     * Verify the referenced variant exists, is active, and belongs
     * to the referenced product. Doing this inside the transaction
     * means we can't link a variant that's being deleted concurrently.
     */
    const variant = await tx.productVariant.findUnique({
      where: { id: payload.variantId },
      select: {
        id: true,
        productId: true,
        isActive: true,
      },
    });

    if (!variant || variant.productId !== payload.productId) {
      throw new NotFoundError("Product or variant not found");
    }

    if (!variant.isActive) {
      throw new ConflictError("Selected variant is not active");
    }

    const response = await sourcingDb.createSourcingResponse(
      {
        requestId,

        productId: payload.productId,
        variantId: payload.variantId,

        message: payload.message || null,
        expiresAt: payload.expiresAt || null,

        status: "ACCEPTED",
      },
      tx,
    );

    await sourcingDb.updateSourcingRequest(
      requestId,
      { status: "RESPONDED" },
      tx,
    );

    return response;
  });
};

export const updateSourcingResponseStatus = async (responseId, status) => {
  const response = await sourcingDb.findSourcingResponseById(responseId);

  if (!response) {
    throw new NotFoundError("Sourcing response not found");
  }

  return sourcingDb.updateSourcingResponse(responseId, { status });
};
