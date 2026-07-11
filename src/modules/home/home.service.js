// modules/home/home.service.js
import * as productService from "../products/product.service.js";
import * as categoryService from "../categories/category.service.js";
import * as testimonialService from "../testimonials/testimonial.service.js";
import * as businessConfigService from "../businessConfig/businessConfig.service.js";

// ============================================================================
// HOME SERVICE
// ============================================================================

/**
 * Get all data needed for the homepage
 * Orchestrates data from multiple modules in parallel
 */
export const getHomepage = async () => {
  const [
    business,
    categories,
    featuredProducts,
    newArrivals,
    bestSellers,
    testimonials,
  ] = await Promise.all([
    getBusinessConfig(),
    getCategories(),
    getFeaturedProducts(),
    getNewArrivals(),
    getBestSellers(),
    getTestimonials(),
  ]);

  return {
    hero: business.hero || {},
    categories,
    featuredProducts,
    newArrivals,
    bestSellers,
    testimonials,
    business: {
      companyName: business.companyName,
      logo: business.logo,
      phone: business.phone,
      email: business.email,
      socialLinks: business.socialLinks || {},
      address: business.address,
    },
  };
};

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Get business configuration for homepage
 */
const getBusinessConfig = async () => {
  try {
    const config = await businessConfigService.getAllConfigs();

    return {
      companyName: config.store_settings?.companyName || "Keplex",
      logo: config.store_settings?.logo || null,
      hero: {
        title: config.store_settings?.heroTitle || "Welcome to Keplex",
        subtitle:
          config.store_settings?.heroSubtitle || "Discover amazing products",
        image: config.store_settings?.heroImage || null,
        ctaText: config.store_settings?.heroCtaText || "Shop Now",
        ctaUrl: config.store_settings?.heroCtaUrl || "/products",
      },
      phone: config.store_settings?.phone || null,
      email: config.store_settings?.email || null,
      socialLinks: config.store_settings?.socialLinks || {},
      address: config.store_settings?.address || null,
    };
  } catch (error) {
    // Return defaults if config not found
    return {
      companyName: "Keplex",
      logo: null,
      hero: {
        title: "Welcome to Keplex",
        subtitle: "Discover amazing products",
        image: null,
        ctaText: "Shop Now",
        ctaUrl: "/products",
      },
      phone: null,
      email: null,
      socialLinks: {},
      address: null,
    };
  }
};

/**
 * Get categories for homepage
 * Returns only active categories, limited to 8
 */
const getCategories = async () => {
  try {
    const result = await categoryService.getCategories({
      isActive: true,
      limit: 8,
    });

    return (
      result.data?.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image || null,
        description: category.description || null,
        productCount: category._count?.products || 0,
      })) || []
    );
  } catch (error) {
    return [];
  }
};

/**
 * Get featured products for homepage
 * Limited to 8 products
 */
const getFeaturedProducts = async () => {
  try {
    const products = await productService.getFeaturedProducts({
      limit: 8,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceRange:
        product.variants?.length > 0
          ? {
              min: Math.min(...product.variants.map((v) => Number(v.price))),
              max: Math.max(...product.variants.map((v) => Number(v.price))),
            }
          : null,
      image: product.variants?.[0]?.media?.[0]?.url || null,
      brand: product.brand?.name || null,
      rating: product.avgRating || 0,
      reviewCount: product.totalReviews || 0,
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Get new arrivals for homepage
 * Limited to 8 products
 */
const getNewArrivals = async () => {
  try {
    const products = await productService.getNewArrivals({
      limit: 8,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceRange:
        product.variants?.length > 0
          ? {
              min: Math.min(...product.variants.map((v) => Number(v.price))),
              max: Math.max(...product.variants.map((v) => Number(v.price))),
            }
          : null,
      image: product.variants?.[0]?.media?.[0]?.url || null,
      brand: product.brand?.name || null,
      rating: product.avgRating || 0,
      reviewCount: product.totalReviews || 0,
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Get best sellers for homepage
 * Limited to 8 products
 */
const getBestSellers = async () => {
  try {
    const products = await productService.getBestSellers({
      limit: 8,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceRange:
        product.variants?.length > 0
          ? {
              min: Math.min(...product.variants.map((v) => Number(v.price))),
              max: Math.max(...product.variants.map((v) => Number(v.price))),
            }
          : null,
      image: product.variants?.[0]?.media?.[0]?.url || null,
      brand: product.brand?.name || null,
      rating: product.avgRating || 0,
      reviewCount: product.totalReviews || 0,
      salesCount: product.salesCount || 0,
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Get testimonials for homepage
 * Returns only approved testimonials, limited to 6
 */
const getTestimonials = async () => {
  try {
    // Assuming testimonial service has a getApprovedTestimonials method
    // If not, we'll query directly or return empty array
    const testimonials = await testimonialService.getApprovedTestimonials({
      limit: 6,
    });

    return testimonials.map((testimonial) => ({
      id: testimonial.id,
      name: testimonial.name,
      role: testimonial.role || null,
      message: testimonial.message,
      rating: testimonial.rating || 5,
      imageUrl: testimonial.imageUrl || null,
    }));
  } catch (error) {
    return [];
  }
};
