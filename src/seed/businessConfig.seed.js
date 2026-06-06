import { prisma } from "../config/prisma.js";

const DEFAULT_CONFIGS = [
  {
    key: "importation_settings",
    value: {
      enabled: true,
      showOnLandingPage: true,
      showInStore: true,
    },
  },

  {
    key: "pricing_rules",
    value: {
      globalDiscount: 0,

      trainingPromo: {
        active: false,
        percent: 0,
      },
    },
  },

  {
    key: "store_settings",
    value: {
      showImportedCategory: true,
      featuredCategories: [],
    },
  },
];

export const seedBusinessConfigs = async () => {
  for (const config of DEFAULT_CONFIGS) {
    await prisma.businessConfig.upsert({
      where: {
        key: config.key,
      },

      update: {},

      create: config,
    });
  }

  console.log("✅ Business configs seeded");
};
