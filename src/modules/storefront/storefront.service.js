import * as businessConfigDb from "../business-config/businessConfig.db.js";

const DEFAULT_STORE_SETTINGS = {
  companyName: "Keplex",
  logo: null,
  phone: null,
  email: null,
  socialLinks: {},
  address: null,
  heroSlides: [],
  featuredCategories: [],
};

export const getStorefrontConfig = async () => {
  const config = await businessConfigDb.findConfigByKey("store_settings");

  const settings = {
    ...DEFAULT_STORE_SETTINGS,
    ...(config?.value ?? {}),
  };

  return {
    companyName: settings.companyName,
    logo: settings.logo,
    phone: settings.phone,
    email: settings.email,
    socialLinks: settings.socialLinks,
    address: settings.address,

    heroSlides: Array.isArray(settings.heroSlides)
      ? settings.heroSlides
          .filter((slide) => slide?.isActive !== false)
          .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
      : [],

    featuredCategories: Array.isArray(settings.featuredCategories)
      ? settings.featuredCategories
      : [],
  };
};
