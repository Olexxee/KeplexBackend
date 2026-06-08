import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as businessConfigDb from "./businessConfig.db.js";

const ALLOWED_KEYS = [
  "training_programs",
  "importation_settings",
  "pricing_rules",
  "store_settings",
  "training_faq",
];

export const getAllConfigs = async () => {
  const configs = await businessConfigDb.findAllConfigs();

  return {
    importation_settings: configs.find((c) => c.key === "importation_settings")
      ?.value ?? {
      enabled: false,
      showOnLandingPage: false,
      showInStore: false,
    },
    pricing_rules: configs.find((c) => c.key === "pricing_rules")?.value ?? {
      globalDiscount: 0,
      trainingPromo: { active: false, percent: 0 },
    },
    store_settings: configs.find((c) => c.key === "store_settings")?.value ?? {
      showImportedCategory: false,
      featuredCategories: [],
    },
    training_programs:
      configs.find((c) => c.key === "training_programs")?.value ?? [],
    training_faq: configs.find((c) => c.key === "training_faq")?.value ?? [],
  };
};

export const getConfigByKey = async (key) => {
  if (!ALLOWED_KEYS.includes(key)) {
    throw new BadRequestError(
      `Invalid configuration key: ${key}. Allowed keys: ${ALLOWED_KEYS.join(", ")}`,
    );
  }

  const config = await businessConfigDb.findConfigByKey(key);

  if (!config) {
    throw new NotFoundError(`Configuration not found for key: ${key}`);
  }

  return config;
};

export const updateConfig = async ({ key, value }) => {
  if (!ALLOWED_KEYS.includes(key)) {
    throw new BadRequestError(
      `Invalid configuration key: ${key}. Allowed keys: ${ALLOWED_KEYS.join(", ")}`,
    );
  }

  return businessConfigDb.upsertConfig({
    key,
    value,
  });
};
