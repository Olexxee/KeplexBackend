// modules/orders/order.state.js
const TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const REQUIRES_STOCK_RESTORE = ["CANCELLED"];

export const canTransition = (from, to) => {
  const allowed = TRANSITIONS[from] || [];
  return allowed.includes(to);
};

export const assertValidTransition = (from, to) => {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order status transition: ${from} → ${to}`);
  }
};

export const requiresStockRestore = (to) => {
  return REQUIRES_STOCK_RESTORE.includes(to);
};

export const isTerminalState = (status) => {
  return ["COMPLETED", "CANCELLED"].includes(status);
};

export const isEditableState = (status) => {
  return ["PENDING", "CONFIRMED"].includes(status);
};

export const getAvailableTransitions = (from) => {
  return TRANSITIONS[from] || [];
};
