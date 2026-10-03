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

    product: variant.product
      ? {
          id: variant.product.id,
          name: variant.product.name,
          slug: variant.product.slug,
        }
      : null,

    media: variant.media ?? [],
  };
};

/* ------------------------------------------------------------------ */
/* Response                                                           */
/* ------------------------------------------------------------------ */

export const toSourcingResponse = (response) => ({
  id: response.id,
  message: response.message ?? null,
  status: response.status,
  expiresAt: response.expiresAt ?? null,

  product: mapProduct(response.product),
  variant: mapVariant(response.variant),

  createdAt: response.createdAt,
  updatedAt: response.updatedAt,
});

/* ------------------------------------------------------------------ */
/* Customer                                                           */
/* ------------------------------------------------------------------ */

const mapCustomer = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.fullName ?? null,
    email: user.email ?? null,
  };
};

/* ------------------------------------------------------------------ */
/* Request                                                            */
/* ------------------------------------------------------------------ */

export const toSourcingRequest = (request) => ({
  id: request.id,
  requestNumber: request.requestNumber,

  title: request.title,
  description: request.description ?? null,
  referenceUrl: request.referenceUrl ?? null,
  referenceImages: request.referenceImages ?? [],

  status: request.status,
  aiAnalysis: request.aiAnalysis ?? null,

  responses: request.responses?.map(toSourcingResponse) ?? [],

  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

/* ------------------------------------------------------------------ */
/* Admin Request                                                      */
/* ------------------------------------------------------------------ */

export const toAdminSourcingRequest = (request) => ({
  id: request.id,
  requestNumber: request.requestNumber,

  title: request.title,
  description: request.description ?? null,
  referenceUrl: request.referenceUrl ?? null,
  referenceImages: request.referenceImages ?? [],

  status: request.status,
  aiAnalysis: request.aiAnalysis ?? null,

  customer: mapCustomer(request.user),

  responses: request.responses?.map(toSourcingResponse) ?? [],

  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

/* ------------------------------------------------------------------ */
/* List helpers                                                       */
/* ------------------------------------------------------------------ */

export const toSourcingRequestList = (result) => ({
  requests: result.requests.map(toSourcingRequest),
  meta: result.meta,
});
