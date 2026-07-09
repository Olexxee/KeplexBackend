// prisma/seed/migrate-items-to-products.js
import { prisma } from "../../src/config/prisma.js";
import { SKUGenerator } from "../../src/modules/variants/sku.generator.js";
import { CBMCalculator } from "../../src/modules/shipping/cbm.calculator.js";

/**
 * This script migrates existing items to the new product/variant structure
 * Run with: node prisma/seed/migrate-items-to-products.js
 */
async function migrateItemsToProducts() {
  console.log("🚀 Starting migration: Items → Products + Variants");

  try {
    // 1. Fetch all existing items
    const items = await prisma.item.findMany({
      include: {
        category: true,
        media: true,
        cartItems: true,
        orderItems: true,
      },
    });

    console.log(`📦 Found ${items.length} items to migrate`);

    let migratedCount = 0;
    let failedCount = 0;
    const errors = [];

    // 2. Process each item
    for (const item of items) {
      try {
        console.log(`🔄 Processing item: ${item.name} (${item.id})`);

        // 2.1 Create product from item
        const product = await prisma.product.create({
          data: {
            name: item.name,
            slug: item.slug,
            description: item.description,
            categoryId: item.categoryId,
            status: mapItemStatus(item.status),
            isFeatured: false, // Default, can be updated later
            isNew: false, // Default, can be updated later
            isBestSeller: false, // Default, can be updated later
            metadata: item.metadata,
            // Brand and Collection will be null initially
          },
        });

        console.log(`  ✅ Created product: ${product.name} (${product.id})`);

        // 2.2 Create variant from item
        // Generate SKU if not exists
        let sku = item.sku;
        if (!sku) {
          sku = await SKUGenerator.generateSKU({
            productName: item.name,
            categoryId: item.categoryId,
            color: "DEFAULT",
            size: "ONE",
          });
        }

        // Prepare variant data
        const variantData = {
          productId: product.id,
          sku: sku,
          color: "DEFAULT",
          size: "ONE",
          weight: 0, // Default, will need to be updated later
          price: Number(item.price),
          compareAtPrice: item.compareAtPrice
            ? Number(item.compareAtPrice)
            : null,
          stock: item.stock || 0,
          fulfillmentType: "LOCAL", // Default
          actualWeight: 0, // Default, will need to be updated later
          shippingType: "LOCAL",
          isActive: item.status === "ACTIVE",
          images:
            item.media?.map((m) => ({
              url: m.url,
              publicId: m.publicId,
              isPrimary: m.isPrimary,
              sortOrder: m.sortOrder,
            })) || [],
          metadata: item.metadata,
        };

        const variant = await prisma.productVariant.create({
          data: variantData,
        });

        console.log(`  ✅ Created variant: ${variant.sku} (${variant.id})`);

        // 2.3 Update cart items to use variantId instead of itemId
        if (item.cartItems && item.cartItems.length > 0) {
          console.log(`  🔄 Updating ${item.cartItems.length} cart items`);

          for (const cartItem of item.cartItems) {
            await prisma.cartItem.update({
              where: { id: cartItem.id },
              data: {
                variantId: variant.id,
                unitPriceSnapshot: Number(item.price),
              },
            });
          }
        }

        // 2.4 Update order items to use variantId instead of itemId
        if (item.orderItems && item.orderItems.length > 0) {
          console.log(`  🔄 Updating ${item.orderItems.length} order items`);

          for (const orderItem of item.orderItems) {
            await prisma.orderItem.update({
              where: { id: orderItem.id },
              data: {
                variantId: variant.id,
                unitPriceSnapshot: Number(item.price),
              },
            });
          }
        }

        migratedCount++;
        console.log(`  ✅ Migration complete for ${item.name}\n`);
      } catch (error) {
        failedCount++;
        errors.push({
          itemId: item.id,
          itemName: item.name,
          error: error.message,
        });
        console.error(
          `  ❌ Failed to migrate ${item.name}: ${error.message}\n`,
        );
      }
    }

    // 3. Create default brand if none exists
    const brandCount = await prisma.brand.count();
    if (brandCount === 0) {
      console.log("📦 Creating default brand");
      await prisma.brand.create({
        data: {
          name: "General",
          slug: "general",
          isActive: true,
        },
      });
    }

    // 4. Create default collection if none exists
    const collectionCount = await prisma.collection.count();
    if (collectionCount === 0) {
      console.log("📦 Creating default collection");
      await prisma.collection.create({
        data: {
          name: "All Products",
          slug: "all-products",
          isActive: true,
        },
      });
    }

    // 5. Summary report
    console.log("\n📊 MIGRATION SUMMARY");
    console.log("====================");
    console.log(`✅ Successfully migrated: ${migratedCount} items`);
    console.log(`❌ Failed migrations: ${failedCount} items`);

    if (errors.length > 0) {
      console.log("\n❌ ERRORS:");
      errors.forEach((err, index) => {
        console.log(
          `  ${index + 1}. ${err.itemName} (${err.itemId}): ${err.error}`,
        );
      });
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Map old ItemStatus to new ProductStatus
 */
function mapItemStatus(status) {
  const statusMap = {
    DRAFT: "DRAFT",
    ACTIVE: "ACTIVE",
    ARCHIVED: "ARCHIVED",
    OUT_OF_STOCK: "ACTIVE", // Map OUT_OF_STOCK to ACTIVE
  };
  return statusMap[status] || "DRAFT";
}

/**
 * Run migration
 */
migrateItemsToProducts()
  .then(() => {
    console.log("✨ Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration script failed:", error);
    process.exit(1);
  });
