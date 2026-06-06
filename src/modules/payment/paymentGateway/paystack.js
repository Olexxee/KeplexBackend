import axios from "axios";
import { env } from "../../../config/env.js";
import { BadRequestError } from "../../../classes/errorClasses.js";

const BASE_URL = "https://api.paystack.co";

/**
 * Normalize amount to kobo
 */
export const toKobo = (amount) => {
  const value = Number(amount);
  if (Number.isNaN(value)) {
    throw new BadRequestError("Invalid amount");
  }
  return Math.round(value * 100);
};

/**
 * Generate unique reference
 */
export const generateReference = (prefix = "KPX") => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

/**
 * Map Paystack status → internal status
 */
export const mapStatus = (status) => {
  switch (status) {
    case "success":
      return "SUCCESS";
    case "failed":
      return "FAILED";
    case "reversed":
      return "REVERSED";
    case "abandoned":
      return "ABANDONED";
    default:
      return "PENDING";
  }
};

/**
 * Initialize transaction
 */
export const initializeTransaction = async ({
  email,
  amount,
  reference,
  metadata = {},
  currency = "NGN",
  callbackUrl = env.paystack.callbackUrl,
}) => {
  const response = await axios.post(
    `${BASE_URL}/transaction/initialize`,
    {
      email,
      amount: toKobo(amount),
      reference,
      currency,
      callback_url: callbackUrl,
      metadata,
    },
    {
      headers: {
        Authorization: `Bearer ${env.paystack.secretKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = response.data?.data;

  if (!response.data?.status || !data?.authorization_url) {
    throw new BadRequestError("Failed to initialize Paystack transaction");
  }

  return {
    authorization_url: data.authorization_url,
    access_code: data.access_code,
    reference,
    raw: response.data,
  };
};

/**
 * Verify transaction
 */
export const verifyTransaction = async (reference) => {
  const response = await axios.get(
    `${BASE_URL}/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${env.paystack.secretKey}`,
      },
    },
  );

  const data = response.data?.data;

  if (!response.data?.status || !data) {
    throw new BadRequestError("Failed to verify Paystack transaction");
  }

  return {
    status: mapStatus(data.status),
    reference: data.reference,
    amount: data.amount / 100,
    gatewayStatus: data.status,
    raw: response.data,
  };
};
