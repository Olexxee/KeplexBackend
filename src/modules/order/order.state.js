const TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const canTransition = (from, to) => {
  const allowed = TRANSITIONS[from] || [];
  return allowed.includes(to);
};

export const assertValidTransition = (from, to) => {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order status transition: ${from} → ${to}`);
  }
};
