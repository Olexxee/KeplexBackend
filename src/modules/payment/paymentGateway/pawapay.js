import axios from "axios";
import { randomUUID } from "crypto";

const PAWAPAY_BASE_URL =
  process.env.PAWAPAY_BASE_URL || "https://api.sandbox.pawapay.io";

const PAWAPAY_API_TOKEN = process.env.PAWAPAY_API_TOKEN;

const pawapayClient = axios.create({
  baseURL: PAWAPAY_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAWAPAY_API_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

const assertConfigured = () => {
  if (!PAWAPAY_API_TOKEN) {
    throw new Error("PAWAPAY_API_TOKEN is not configured");
  }
};

export const generateDepositId = () => randomUUID();

export const initializeDeposit = async ({
  depositId,
  amount,
  currency,
  phoneNumber,
  provider,
  clientReferenceId,
  customerMessage,
  metadata = [],
  preAuthorisationCode,
}) => {
  assertConfigured();

  if (!depositId) {
    throw new Error("pawaPay depositId is required");
  }

  if (!phoneNumber) {
    throw new Error("pawaPay phone number is required");
  }

  if (!provider) {
    throw new Error("pawaPay provider is required");
  }

  const payload = {
    depositId,
    payer: {
      type: "MMO",
      accountDetails: {
        phoneNumber,
        provider,
      },
    },
    amount: String(amount),
    currency,
    clientReferenceId,
    ...(preAuthorisationCode
      ? {
          preAuthorisationCode,
        }
      : {}),
    ...(customerMessage
      ? {
          customerMessage,
        }
      : {}),
    ...(metadata.length
      ? {
          metadata,
        }
      : {}),
  };

  const response = await pawapayClient.post("/v2/deposits", payload);

  return {
    depositId: response.data.depositId,
    status: response.data.status,
    created: response.data.created,
    rejectionReason: response.data.rejectionReason || null,
    raw: response.data,
  };
};

export const getDepositStatus = async (depositId) => {
  assertConfigured();

  const response = await pawapayClient.get(`/v2/deposits/${depositId}`);

  return response.data;
};
