
export const CONTRACT = {
  STOREFRONT_CARD: "storefront-card",
  STOREFRONT_DETAIL: "storefront-detail",
  ADMIN_LIST: "admin-list",
  ADMIN_DETAIL: "admin-detail",
};

/**
 * Price and rating are ALWAYS present. No consumer should ever fall
 * back to `variants[0].price`. If the computation fails, the mapper
 * throws — silently shipping a wrong price is worse than a 500.
 */
export const requiredCardFields = [
  "id",
  "slug",
  "name",
  "priceRange",
  "avgRating",
  "totalReviews",
];
