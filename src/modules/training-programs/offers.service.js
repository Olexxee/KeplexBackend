import * as trainingDb from "../training/trainingProgram.db.js";
import * as itemDb from "../catalog/item.db.js";
import { dbClient } from "../../lib/dbClient.js";

export const getPublicOffers = async () => {
  const db = dbClient();

  const [trainings, items, importation] = await Promise.all([
    trainingDb.listTrainingPrograms({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      take: 6,
    }),

    itemDb.listItems({
      where: { status: "ACTIVE" },
      include: { media: true, category: true },
      take: 8,
    }),

    db.businessConfig.findUnique({
      where: { key: "importation_settings" },
    }),
  ]);

  return {
    trainings,
    ecommerce: items,
    importation: importation?.value ?? {
      title: "Import Directly from China",
      description:
        "We help you preorder products directly from trusted suppliers.",
      active: true,
    },
  };
};
