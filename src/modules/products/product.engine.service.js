import * as productService from "./product.service.js";

export class ProductEngine {
  async getProducts({ context = "catalog", filters = {}, options = {} }) {
    switch (context) {
      case "homepage":
        return this.handleHomepage(filters, options);

      case "product-detail":
        return this.handleProductDetail(filters, options);

      case "catalog":
      default:
        return this.handleCatalog(filters);
    }
  }

  // ========================================================================
  // HOMEPAGE
  // ========================================================================

  async handleHomepage(filters = {}, options = {}) {
    const { featuredLimit = 6, newLimit = 4, bestSellerLimit = 4 } = options;

    const [featured, newArrivals, bestSellers] = await Promise.all([
      productService.getFeaturedProducts({
        ...filters,
        limit: featuredLimit,
      }),

      productService.getNewArrivals({
        ...filters,
        limit: newLimit,
      }),

      productService.getBestSellers({
        ...filters,
        limit: bestSellerLimit,
      }),
    ]);

    return {
      context: "homepage",

      data: {
        featured,
        newArrivals,
        bestSellers,
      },

      meta: {
        featuredCount: featured.length,
        newCount: newArrivals.length,
        bestSellerCount: bestSellers.length,
      },
    };
  }

  // ========================================================================
  // CATALOG
  // ========================================================================

  async handleCatalog(filters = {}) {
    const result = await productService.getProducts(filters);

    return {
      context: "catalog",

      data: {
        products: result.products,
      },

      meta: result.meta,
    };
  }

  // ========================================================================
  // PRODUCT DETAIL
  // ========================================================================

  async handleProductDetail(filters = {}, options = {}) {
    const { slug, id } = filters;

    const { relatedLimit = 4 } = options;

    let product;

    if (slug) {
      product = await productService.getProductBySlug(slug);
    } else if (id) {
      product = await productService.getProductById(id);
    } else {
      throw new Error("Product slug or id is required.");
    }

    const related = await productService.getRelatedProducts(
      product.id,
      relatedLimit,
    );

    return {
      context: "product-detail",

      data: {
        product,
        related,
      },
    };
  }
}

export const productEngine = new ProductEngine();
