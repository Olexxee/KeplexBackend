/**
 * Product mappers.
 *
 * Every response the API sends passes through one of these. They exist
 * so the wire format is decided in exactly one place — no controller,
 * service, or db function should ever return a raw Prisma row for a
 * product read.
 *
 * Contracts:
 *   toStorefrontCard(s)  → StorefrontCard     (catalog, homepage, related)
 *   toStorefrontDetail   → StorefrontDetail   (product page)
 *   toAdminList(s)       → AdminListRow       (admin table)
 *   toAdminDetail        → AdminProductDetail (admin edit form)
 */

// ============================================================================
// HELPERS
// ============================================================================

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const pickPrimaryImage = (media = []) => {
  const primary = media.find((m) => m.isPrimary);
  return primary?.url ?? media[0]?.url ?? null;
};

const productImage = (variants = []) => {
  for (const variant of variants) {
    const url = pickPrimaryImage(variant.media);
    if (url) return url;
  }
  return null;
};

const collectRatings = (variants = []) =>
  variants.flatMap((v) => v.reviews?.map((r) => r.rating) ?? []);

const computeAvgRating = (ratings) =>
  ratings.length
    ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
    : 0;

/**
 * Price range across ALL provided variants. Callers must pass the full
 * active variant list — the mapper does not fall back to a single
 * variant's price, which was the source of the featured/best-seller
 * price mismatch bug.
 */
const computePriceRange = (variants = []) => {
  const prices = variants
    .map((v) => toNumber(v.price))
    .filter((p) => p !== null && p > 0);

  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

// ============================================================================
// VARIANT — CARD
// ============================================================================

const mapCardVariant = (variant) => ({
  id: variant.id,
  color: variant.color,
  size: variant.size,
  price: toNumber(variant.price) ?? 0,
  compareAtPrice: toNumber(variant.compareAtPrice),
  stock: variant.stock,
  image: pickPrimaryImage(variant.media),
  isActive: variant.isActive,
});

// ============================================================================
// CONTRACT 1 — STOREFRONT CARD
// ============================================================================

export const toStorefrontCard = (product) => {
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  if (!activeVariants.length) return null;

  const ratings = collectRatings(activeVariants);

  const colors = [
    ...new Set(activeVariants.map((v) => v.color).filter(Boolean)),
  ];
  const sizes = [...new Set(activeVariants.map((v) => v.size).filter(Boolean))];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,

    brand: product.brand?.name ?? null,
    category: product.category?.name ?? null,
    image: productImage(activeVariants),

    priceRange: computePriceRange(activeVariants),
    avgRating: computeAvgRating(ratings),
    totalReviews: ratings.length,

    isNew: product.isNew,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,

    variants: activeVariants.map(mapCardVariant),
    colors,
    sizes,
  };
};

export const toStorefrontCards = (products = []) =>
  products.map(toStorefrontCard).filter(Boolean);

// ============================================================================
// CONTRACT 2 — STOREFRONT DETAIL
// ============================================================================

const mapDetailVariant = (variant) => ({
  id: variant.id,
  sku: variant.sku,
  color: variant.color,
  size: variant.size,

  price: toNumber(variant.price) ?? 0,
  compareAtPrice: toNumber(variant.compareAtPrice),
  stock: variant.stock,

  weight: toNumber(variant.weight) ?? 0,
  actualWeight: toNumber(variant.actualWeight) ?? 0,
  length: toNumber(variant.length),
  width: toNumber(variant.width),
  height: toNumber(variant.height),

  fulfillmentType: variant.fulfillmentType,
  shippingType: variant.shippingType,

  isActive: variant.isActive,
  attributes: variant.attributes ?? {},

  media: (variant.media ?? []).map((m) => ({
    id: m.id,
    url: m.url,
    alt: m.alt,
    isPrimary: m.isPrimary,
    sortOrder: m.sortOrder,
  })),
});

export const toStorefrontDetail = (product, related = []) => {
  if (!product) return null;

  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  const ratings = collectRatings(activeVariants);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,

    brand: product.brand
      ? { name: product.brand.name, slug: product.brand.slug }
      : null,
    category: product.category
      ? { name: product.category.name, slug: product.category.slug }
      : null,
    collection: product.collection
      ? { name: product.collection.name, slug: product.collection.slug }
      : null,

    image: productImage(activeVariants),

    priceRange: computePriceRange(activeVariants),
    avgRating: computeAvgRating(ratings),
    totalReviews: ratings.length,

    isNew: product.isNew,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,

    variants: activeVariants.map(mapDetailVariant),
    related: toStorefrontCards(related),
  };
};

// ============================================================================
// CONTRACT 3 — ADMIN LIST
// ============================================================================

export const toAdminListRow = (product) => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  status: product.status,
  category: product.category?.name ?? null,
  brand: product.brand?.name ?? null,
  variantCount: product._count?.variants ?? product.variants?.length ?? 0,
  isFeatured: product.isFeatured,
  isBestSeller: product.isBestSeller,
  isNew: product.isNew,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

export const toAdminList = (products = []) => products.map(toAdminListRow);

// ============================================================================
// CONTRACT 4 — ADMIN DETAIL
// ============================================================================

const mapAdminVariant = (variant) => ({
  id: variant.id,
  productId: variant.productId,

  sku: variant.sku,
  color: variant.color,
  size: variant.size,

  price: toNumber(variant.price) ?? 0,
  compareAtPrice: toNumber(variant.compareAtPrice),
  stock: variant.stock,

  weight: toNumber(variant.weight) ?? 0,
  actualWeight: toNumber(variant.actualWeight) ?? 0,
  length: toNumber(variant.length),
  width: toNumber(variant.width),
  height: toNumber(variant.height),

  fulfillmentType: variant.fulfillmentType,
  shippingType: variant.shippingType,

  isActive: variant.isActive,

  attributes: variant.attributes ?? {},
  metadata: variant.metadata ?? {},

  media: (variant.media ?? []).map((m) => ({
    id: m.id,
    url: m.url,
    publicId: m.publicId,
    alt: m.alt,
    isPrimary: m.isPrimary,
    sortOrder: m.sortOrder,
  })),

  createdAt: variant.createdAt,
  updatedAt: variant.updatedAt,
});

export const toAdminDetail = (product) => {
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,

    brandId: product.brandId,
    categoryId: product.categoryId,
    collectionId: product.collectionId,

    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isBestSeller: product.isBestSeller,
    status: product.status,

    metadata: product.metadata ?? {},

    // ALL variants — active and inactive.
    variants: (product.variants ?? []).map(mapAdminVariant),

    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};
