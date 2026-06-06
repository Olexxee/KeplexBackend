import { NotFoundError } from "../../classes/errorClasses.js";
import * as businessConfigDb from "./businessConfig.db.js";

const ALLOWED_KEYS = [
  "importation_settings",
  "pricing_rules",
  "store_settings",
];


export const getAllConfigs = async () => {
  const configs = await businessConfigDb.findAllConfigs();

  return {
    importation_settings:
      configs.find((c) => c.key === "importation_settings")?.value ?? {},

    pricing_rules: configs.find((c) => c.key === "pricing_rules")?.value ?? {},

    store_settings:
      configs.find((c) => c.key === "store_settings")?.value ?? {},
  };
};

export const getConfigByKey = async (key) => {
  const config = await businessConfigDb.findConfigByKey(key);

  if (!config) {
    throw new NotFoundError("Configuration not found");
  }

  return config;
};


export const updateConfig = async ({ key, value }) => {
  if (!ALLOWED_KEYS.includes(key)) {
    throw new BadRequestError("Invalid configuration key");
  }

  return businessConfigDb.upsertConfig({
    key,
    value,
  });
};
