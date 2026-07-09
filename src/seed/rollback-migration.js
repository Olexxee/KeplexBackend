// prisma/seed/rollback-migration.js
import { prisma } from "../../src/config/prisma.js";

/**
 * Rollback migration - only use if migration fails
 * Run with: node prisma/seed/rollback-migration.js
 */
async function rollbackMigration() {
  console.log("⚠️ Starting rollback...");

  try {
    // Delete all products and their variants
    await prisma.$transaction([
      prisma.productVariant.deleteMany(),
      prisma.product.deleteMany(),
    ]);

    console.log("✅ Rollback completed - all products and variants deleted");
    console.log("ℹ️ Cart items and order items may still reference old items");
  } catch (error) {
    console.error("❌ Rollback failed:", error);
  }
}

rollbackMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Rollback failed:", error);
    process.exit(1);
  });
