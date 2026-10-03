/* ------------------------------------------------------------------ */
/* Product / variant                                                  */
/* ------------------------------------------------------------------ */

const mapProduct = (product) => {
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,

    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        }
      : null,

    brand: product.brand
      ? {
          id: product.brand.id,
          name: product.brand.name,
          slug: product.brand.slug,
        }
      : null,

    variants:
      product.variants?.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        stock: variant.stock,
        isActive: variant.isActive,
        media: variant.media ?? [],
      })) ?? [],
  };
};

const mapVariant = (variant) => {
  if (!variant) return null;

  return {
    id: variant.id,
    sku: variant.sku,
    color: variant.color,
    size: variant.size,
    price: variant.price,
    stock: variant.stock,
    isActive: variant.isActive,
    product: variant.product ?? null,
    media: variant.media ?? [],
  };
};

/* ------------------------------------------------------------------ */
/* Response                                                           */
/* ------------------------------------------------------------------ */

export const toSourcingResponse = (response) => ({
  id: response.id,
  message: response.message,
  status: response.status,
  expiresAt: response.expiresAt,

  product: mapProduct(response.product),
  variant: mapVariant(response.variant),

  createdAt: response.createdAt,
  updatedAt: response.updatedAt,
});

/* ------------------------------------------------------------------ */
/* Request                                                            */
/* ------------------------------------------------------------------ */

export const toSourcingRequest = (request) => {
  const mapped = {
    id: request.id,
    requestNumber: request.requestNumber,
    title: request.title,
    description: request.description,
    referenceUrl: request.referenceUrl,
    referenceImages: request.referenceImages ?? [],
    status: request.status,
    aiAnalysis: request.aiAnalysis ?? null,

    responses: request.responses?.map(toSourcingResponse) ?? [],

    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };

  /*
   * `user` is only present on admin/detail views. Omit the key entirely
   * (rather than set it to undefined) so internal callers that spread
   * the result don't accidentally shadow a nested `user`.
   */
  if (request.user) {
    mapped.user = {
      id: request.user.id,
      fullName: request.user.fullName,
      email: request.user.email,
      phone: request.user.phone,
    };
  }

  return mapped;
};

/* ------------------------------------------------------------------ */
/* List helpers                                                       */
/* ------------------------------------------------------------------ */

export const toSourcingRequestList = (result) => ({
  requests: result.requests.map(toSourcingRequest),
  meta: result.meta,
});
