import { db } from "@workspace/db";
import { products, customers } from "@workspace/db/schema";

async function seed() {
  const existing = await db.select().from(products).limit(1);
  if (existing.length > 0) {
    console.log("Already seeded, skipping.");
    process.exit(0);
  }

  await db.insert(products).values([
    { name: "Unga Jogoo 2kg", category: "Grains", buyingPrice: "135", sellingPrice: "150", stock: 30, lowStockThreshold: 5, unit: "kg" },
    { name: "Unga Pembe 2kg", category: "Grains", buyingPrice: "130", sellingPrice: "145", stock: 24, lowStockThreshold: 5, unit: "kg" },
    { name: "Rice Pishori 1kg", category: "Grains", buyingPrice: "155", sellingPrice: "175", stock: 20, lowStockThreshold: 5, unit: "kg" },
    { name: "Sugar 1kg", category: "Sugar & Tea", buyingPrice: "135", sellingPrice: "150", stock: 40, lowStockThreshold: 8, unit: "kg" },
    { name: "Cooking Oil 1L", category: "Cooking Oils", buyingPrice: "290", sellingPrice: "320", stock: 18, lowStockThreshold: 5, unit: "litre" },
    { name: "Milk 500ml", category: "Dairy", buyingPrice: "55", sellingPrice: "65", stock: 15, lowStockThreshold: 5, unit: "pcs" },
    { name: "Bread Sliced", category: "Baked Goods", buyingPrice: "55", sellingPrice: "65", stock: 10, lowStockThreshold: 3, unit: "pcs" },
    { name: "Egg (each)", category: "Dairy", buyingPrice: "13", sellingPrice: "15", stock: 60, lowStockThreshold: 12, unit: "pcs" },
    { name: "Maize 1kg", category: "Grains", buyingPrice: "45", sellingPrice: "55", stock: 50, lowStockThreshold: 10, unit: "kg" },
    { name: "Beans 1kg", category: "Grains", buyingPrice: "165", sellingPrice: "185", stock: 25, lowStockThreshold: 5, unit: "kg" },
    { name: "Tomatoes 1kg", category: "Vegetables", buyingPrice: "70", sellingPrice: "90", stock: 8, lowStockThreshold: 3, unit: "kg" },
    { name: "Onions 1kg", category: "Vegetables", buyingPrice: "60", sellingPrice: "75", stock: 12, lowStockThreshold: 3, unit: "kg" },
    { name: "Ketepa Tea 50g", category: "Sugar & Tea", buyingPrice: "60", sellingPrice: "75", stock: 20, lowStockThreshold: 5, unit: "pcs" },
    { name: "Royco 200g", category: "Spices", buyingPrice: "95", sellingPrice: "110", stock: 15, lowStockThreshold: 4, unit: "pcs" },
    { name: "Salt 1kg", category: "Spices", buyingPrice: "35", sellingPrice: "45", stock: 20, lowStockThreshold: 5, unit: "kg" },
    { name: "Omo 400g", category: "Cleaning", buyingPrice: "155", sellingPrice: "175", stock: 12, lowStockThreshold: 3, unit: "pcs" },
    { name: "Blue Band 250g", category: "Dairy", buyingPrice: "135", sellingPrice: "155", stock: 10, lowStockThreshold: 3, unit: "pcs" },
    { name: "Pencil Battery AA 2pk", category: "Electronics", buyingPrice: "55", sellingPrice: "70", stock: 25, lowStockThreshold: 5, unit: "pcs" },
    { name: "Soda Coca-Cola 500ml", category: "Beverages", buyingPrice: "55", sellingPrice: "70", stock: 24, lowStockThreshold: 6, unit: "pcs" },
    { name: "Water Keringet 500ml", category: "Beverages", buyingPrice: "25", sellingPrice: "35", stock: 36, lowStockThreshold: 12, unit: "pcs" },
  ]);

  await db.insert(customers).values([
    { name: "Mama Wanjiku", phone: "0712345678" },
    { name: "Bwana Otieno", phone: "0723456789" },
    { name: "Grace Muthoni", phone: "0734567890" },
  ]);

  console.log("Seeded successfully.");
}

seed().catch(console.error).finally(() => process.exit(0));
