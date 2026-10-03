const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const mapMedia = (media = []) =>
  media.map((item) => ({
    id: item.id,
    url: item.url,
    isPrimary: item.isPrimary,
    sortOrder: item.sortOrder,
  }));

const mapVariant = (variant) => ({
  id: variant.id,
  sku: variant.sku,

  color: variant.color,
  size: variant.size,

  price: toNumber(variant.price),

  compareAtPrice:
    variant.compareAtPrice == null ? null : toNumber(variant.compareAtPrice),

  stock: variant.stock,

  fulfillmentType: variant.fulfillmentType,

  shippingType: variant.shippingType,

  media: mapMedia(variant.media),
});

const getPriceRange = (variants = []) => {
  const prices = variants
    .map((variant) => toNumber(variant.price))
    .filter(Number.isFinite);

  if (!prices.length) {
    return {
      min: 0,
      max: 0,
    };
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
};

export const mapShoppingProduct = ({ product, score, shipping = null }) => ({
  id: product.id,

  name: product.name,

  slug: product.slug,

  description: product.description ?? null,

  brand: product.brand
    ? {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
      }
    : null,

  category: product.category
    ? {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      }
    : null,

  price: getPriceRange(product.variants),

  variants: product.variants.map(mapVariant),

  relevanceScore: Number(score.toFixed(3)),

  shipping,
});
