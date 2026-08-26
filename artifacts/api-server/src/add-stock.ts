// One-off, non-destructive script: adds a curated catalog of common Kenyan
// retail/duka products. Unlike seed.ts, this NEVER deletes or checks for
// existing rows — it's safe to run on a database that already has real
// products and sales history.
import { db } from "@workspace/db";
import { products } from "@workspace/db/schema";

async function addStock() {
  const inserted = await db
    .insert(products)
    .values([
      // Grains & Cereals
      { name: "Unga Jogoo 2kg", category: "Grains & Cereals", buyingPrice: "135", sellingPrice: "150", stock: 30, lowStockThreshold: 5, unit: "pcs" },
      { name: "Unga Pembe 2kg", category: "Grains & Cereals", buyingPrice: "130", sellingPrice: "145", stock: 24, lowStockThreshold: 5, unit: "pcs" },
      { name: "Unga Ndovu 2kg", category: "Grains & Cereals", buyingPrice: "128", sellingPrice: "142", stock: 22, lowStockThreshold: 5, unit: "pcs" },
      { name: "Rice Pishori 1kg", category: "Grains & Cereals", buyingPrice: "155", sellingPrice: "175", stock: 20, lowStockThreshold: 5, unit: "kg" },
      { name: "Rice Basmati 1kg", category: "Grains & Cereals", buyingPrice: "185", sellingPrice: "210", stock: 15, lowStockThreshold: 4, unit: "kg" },
      { name: "Maize (Dry) 1kg", category: "Grains & Cereals", buyingPrice: "45", sellingPrice: "55", stock: 50, lowStockThreshold: 10, unit: "kg" },
      { name: "Beans (Rosecoco) 1kg", category: "Grains & Cereals", buyingPrice: "165", sellingPrice: "185", stock: 25, lowStockThreshold: 5, unit: "kg" },
      { name: "Green Grams (Ndengu) 1kg", category: "Grains & Cereals", buyingPrice: "175", sellingPrice: "195", stock: 15, lowStockThreshold: 4, unit: "kg" },
      { name: "Weetabix 24pk", category: "Grains & Cereals", buyingPrice: "480", sellingPrice: "540", stock: 6, lowStockThreshold: 2, unit: "pcs" },

      // Cooking Oils & Fats
      { name: "Cooking Oil (Fresh Fri) 1L", category: "Cooking Oils", buyingPrice: "290", sellingPrice: "320", stock: 18, lowStockThreshold: 5, unit: "litre" },
      { name: "Cooking Oil (Elianto) 1L", category: "Cooking Oils", buyingPrice: "285", sellingPrice: "315", stock: 16, lowStockThreshold: 5, unit: "litre" },
      { name: "Cooking Oil 500ml", category: "Cooking Oils", buyingPrice: "155", sellingPrice: "175", stock: 20, lowStockThreshold: 5, unit: "pcs" },
      { name: "Blue Band 250g", category: "Cooking Oils", buyingPrice: "135", sellingPrice: "155", stock: 10, lowStockThreshold: 3, unit: "pcs" },

      // Sugar, Tea & Beverages (dry)
      { name: "Sugar 1kg", category: "Sugar & Tea", buyingPrice: "135", sellingPrice: "150", stock: 40, lowStockThreshold: 8, unit: "kg" },
      { name: "Sugar 2kg", category: "Sugar & Tea", buyingPrice: "265", sellingPrice: "295", stock: 18, lowStockThreshold: 5, unit: "kg" },
      { name: "Ketepa Tea 50g", category: "Sugar & Tea", buyingPrice: "60", sellingPrice: "75", stock: 20, lowStockThreshold: 5, unit: "pcs" },
      { name: "Ketepa Tea 100g", category: "Sugar & Tea", buyingPrice: "110", sellingPrice: "130", stock: 12, lowStockThreshold: 3, unit: "pcs" },
      { name: "Kenya Gold Instant Coffee 50g", category: "Sugar & Tea", buyingPrice: "185", sellingPrice: "220", stock: 8, lowStockThreshold: 2, unit: "pcs" },
      { name: "Milo 400g", category: "Sugar & Tea", buyingPrice: "380", sellingPrice: "430", stock: 6, lowStockThreshold: 2, unit: "pcs" },

      // Dairy
      { name: "Milk (Fresh) 500ml", category: "Dairy", buyingPrice: "55", sellingPrice: "65", stock: 15, lowStockThreshold: 5, unit: "pcs" },
      { name: "Milk (Long Life) 500ml", category: "Dairy", buyingPrice: "65", sellingPrice: "80", stock: 20, lowStockThreshold: 5, unit: "pcs" },
      { name: "Yoghurt (Plain) 500ml", category: "Dairy", buyingPrice: "110", sellingPrice: "130", stock: 10, lowStockThreshold: 3, unit: "pcs" },
      { name: "Egg (Tray of 30)", category: "Dairy", buyingPrice: "380", sellingPrice: "450", stock: 10, lowStockThreshold: 3, unit: "pcs" },
      { name: "Egg (each)", category: "Dairy", buyingPrice: "13", sellingPrice: "15", stock: 60, lowStockThreshold: 12, unit: "pcs" },

      // Baked Goods
      { name: "Bread (Sliced) 400g", category: "Baked Goods", buyingPrice: "55", sellingPrice: "65", stock: 10, lowStockThreshold: 3, unit: "pcs" },
      { name: "Mandazi (each)", category: "Baked Goods", buyingPrice: "8", sellingPrice: "10", stock: 30, lowStockThreshold: 10, unit: "pcs" },
      { name: "Biscuits (Digestive) 200g", category: "Baked Goods", buyingPrice: "75", sellingPrice: "90", stock: 15, lowStockThreshold: 4, unit: "pcs" },
      { name: "Cake (Snack Pack)", category: "Baked Goods", buyingPrice: "35", sellingPrice: "45", stock: 20, lowStockThreshold: 5, unit: "pcs" },

      // Vegetables & Fruits
      { name: "Tomatoes 1kg", category: "Vegetables & Fruits", buyingPrice: "70", sellingPrice: "90", stock: 8, lowStockThreshold: 3, unit: "kg" },
      { name: "Onions 1kg", category: "Vegetables & Fruits", buyingPrice: "60", sellingPrice: "75", stock: 12, lowStockThreshold: 3, unit: "kg" },
      { name: "Sukuma Wiki (bunch)", category: "Vegetables & Fruits", buyingPrice: "10", sellingPrice: "15", stock: 25, lowStockThreshold: 8, unit: "pcs" },
      { name: "Cabbage (each)", category: "Vegetables & Fruits", buyingPrice: "35", sellingPrice: "50", stock: 12, lowStockThreshold: 3, unit: "pcs" },
      { name: "Irish Potatoes 1kg", category: "Vegetables & Fruits", buyingPrice: "60", sellingPrice: "80", stock: 20, lowStockThreshold: 5, unit: "kg" },
      { name: "Bananas (bunch)", category: "Vegetables & Fruits", buyingPrice: "150", sellingPrice: "200", stock: 8, lowStockThreshold: 2, unit: "pcs" },
      { name: "Avocado (each)", category: "Vegetables & Fruits", buyingPrice: "15", sellingPrice: "25", stock: 30, lowStockThreshold: 8, unit: "pcs" },

      // Spices & Seasoning
      { name: "Royco Mchuzi Mix 200g", category: "Spices & Seasoning", buyingPrice: "95", sellingPrice: "110", stock: 15, lowStockThreshold: 4, unit: "pcs" },
      { name: "Salt 1kg", category: "Spices & Seasoning", buyingPrice: "35", sellingPrice: "45", stock: 20, lowStockThreshold: 5, unit: "kg" },
      { name: "Tomato Paste (Sachet)", category: "Spices & Seasoning", buyingPrice: "12", sellingPrice: "20", stock: 40, lowStockThreshold: 10, unit: "pcs" },
      { name: "Curry Powder 100g", category: "Spices & Seasoning", buyingPrice: "45", sellingPrice: "60", stock: 12, lowStockThreshold: 3, unit: "pcs" },

      // Cleaning & Household
      { name: "Omo Washing Powder 400g", category: "Cleaning & Household", buyingPrice: "155", sellingPrice: "175", stock: 12, lowStockThreshold: 3, unit: "pcs" },
      { name: "Bar Soap (Ushindi)", category: "Cleaning & Household", buyingPrice: "60", sellingPrice: "75", stock: 25, lowStockThreshold: 6, unit: "pcs" },
      { name: "Dishwashing Liquid (Sunlight) 500ml", category: "Cleaning & Household", buyingPrice: "140", sellingPrice: "165", stock: 10, lowStockThreshold: 3, unit: "pcs" },
      { name: "Jik Bleach 500ml", category: "Cleaning & Household", buyingPrice: "95", sellingPrice: "115", stock: 12, lowStockThreshold: 3, unit: "pcs" },
      { name: "Toilet Paper (4 Roll Pack)", category: "Cleaning & Household", buyingPrice: "110", sellingPrice: "135", stock: 15, lowStockThreshold: 4, unit: "pcs" },
      { name: "Matchbox", category: "Cleaning & Household", buyingPrice: "5", sellingPrice: "10", stock: 50, lowStockThreshold: 10, unit: "pcs" },
      { name: "Candle (each)", category: "Cleaning & Household", buyingPrice: "15", sellingPrice: "25", stock: 30, lowStockThreshold: 8, unit: "pcs" },
      { name: "Charcoal (Tin)", category: "Cleaning & Household", buyingPrice: "60", sellingPrice: "80", stock: 15, lowStockThreshold: 4, unit: "pcs" },

      // Personal Care
      { name: "Toothpaste (Colgate) 100ml", category: "Personal Care", buyingPrice: "110", sellingPrice: "135", stock: 15, lowStockThreshold: 4, unit: "pcs" },
      { name: "Toothbrush", category: "Personal Care", buyingPrice: "35", sellingPrice: "50", stock: 20, lowStockThreshold: 5, unit: "pcs" },
      { name: "Bathing Soap (Geisha)", category: "Personal Care", buyingPrice: "50", sellingPrice: "65", stock: 20, lowStockThreshold: 5, unit: "pcs" },
      { name: "Petroleum Jelly (Vaseline) 100ml", category: "Personal Care", buyingPrice: "90", sellingPrice: "110", stock: 12, lowStockThreshold: 3, unit: "pcs" },
      { name: "Sanitary Pads (Always)", category: "Personal Care", buyingPrice: "85", sellingPrice: "105", stock: 15, lowStockThreshold: 4, unit: "pcs" },
      { name: "Roll-On Deodorant", category: "Personal Care", buyingPrice: "150", sellingPrice: "180", stock: 10, lowStockThreshold: 3, unit: "pcs" },
      { name: "Razor Blade (each)", category: "Personal Care", buyingPrice: "10", sellingPrice: "15", stock: 40, lowStockThreshold: 10, unit: "pcs" },

      // Beverages
      { name: "Soda (Coca-Cola) 500ml", category: "Beverages", buyingPrice: "55", sellingPrice: "70", stock: 24, lowStockThreshold: 6, unit: "pcs" },
      { name: "Soda (Fanta) 500ml", category: "Beverages", buyingPrice: "55", sellingPrice: "70", stock: 24, lowStockThreshold: 6, unit: "pcs" },
      { name: "Water (Keringet) 500ml", category: "Beverages", buyingPrice: "25", sellingPrice: "35", stock: 36, lowStockThreshold: 12, unit: "pcs" },
      { name: "Water (Dasani) 1L", category: "Beverages", buyingPrice: "45", sellingPrice: "60", stock: 20, lowStockThreshold: 6, unit: "pcs" },
      { name: "Juice (Minute Maid) 300ml", category: "Beverages", buyingPrice: "60", sellingPrice: "80", stock: 15, lowStockThreshold: 4, unit: "pcs" },
      { name: "Energy Drink (Predator)", category: "Beverages", buyingPrice: "70", sellingPrice: "90", stock: 12, lowStockThreshold: 3, unit: "pcs" },

      // Snacks & Confectionery
      { name: "Crisps (Tropical Heat) 100g", category: "Snacks & Confectionery", buyingPrice: "50", sellingPrice: "65", stock: 20, lowStockThreshold: 5, unit: "pcs" },
      { name: "Chewing Gum (Big G)", category: "Snacks & Confectionery", buyingPrice: "8", sellingPrice: "10", stock: 60, lowStockThreshold: 15, unit: "pcs" },
      { name: "Sweets (Chappa Mint) each", category: "Snacks & Confectionery", buyingPrice: "3", sellingPrice: "5", stock: 100, lowStockThreshold: 20, unit: "pcs" },
      { name: "Chocolate Bar (Cadbury)", category: "Snacks & Confectionery", buyingPrice: "90", sellingPrice: "115", stock: 15, lowStockThreshold: 4, unit: "pcs" },
      { name: "Peanuts (Roasted) 100g", category: "Snacks & Confectionery", buyingPrice: "35", sellingPrice: "50", stock: 20, lowStockThreshold: 5, unit: "pcs" },

      // Baby Products
      { name: "Diapers (Pampers) Pack", category: "Baby Products", buyingPrice: "550", sellingPrice: "620", stock: 6, lowStockThreshold: 2, unit: "pcs" },
      { name: "Baby Powder 100g", category: "Baby Products", buyingPrice: "120", sellingPrice: "150", stock: 8, lowStockThreshold: 2, unit: "pcs" },
      { name: "Baby Lotion 100ml", category: "Baby Products", buyingPrice: "150", sellingPrice: "185", stock: 8, lowStockThreshold: 2, unit: "pcs" },

      // Electronics & Accessories
      { name: "Pencil Battery AA (2pk)", category: "Electronics & Accessories", buyingPrice: "55", sellingPrice: "70", stock: 25, lowStockThreshold: 5, unit: "pcs" },
      { name: "Torch Battery D (2pk)", category: "Electronics & Accessories", buyingPrice: "80", sellingPrice: "100", stock: 15, lowStockThreshold: 4, unit: "pcs" },
      { name: "Phone Charging Cable", category: "Electronics & Accessories", buyingPrice: "150", sellingPrice: "220", stock: 10, lowStockThreshold: 3, unit: "pcs" },
      { name: "Earphones (Basic)", category: "Electronics & Accessories", buyingPrice: "100", sellingPrice: "150", stock: 12, lowStockThreshold: 3, unit: "pcs" },
      { name: "Light Bulb (LED) 9W", category: "Electronics & Accessories", buyingPrice: "180", sellingPrice: "220", stock: 10, lowStockThreshold: 3, unit: "pcs" },

      // Stationery
      { name: "Exercise Book (200pg)", category: "Stationery", buyingPrice: "45", sellingPrice: "60", stock: 30, lowStockThreshold: 8, unit: "pcs" },
      { name: "Pen (Biro)", category: "Stationery", buyingPrice: "8", sellingPrice: "15", stock: 50, lowStockThreshold: 10, unit: "pcs" },
      { name: "Pencil (HB)", category: "Stationery", buyingPrice: "8", sellingPrice: "15", stock: 40, lowStockThreshold: 10, unit: "pcs" },
      { name: "Ruler (30cm)", category: "Stationery", buyingPrice: "15", sellingPrice: "25", stock: 20, lowStockThreshold: 5, unit: "pcs" },

      // Airtime & Mobile Money
      { name: "Airtime Scratch Card (KES 100)", category: "Airtime & Mobile Money", buyingPrice: "98", sellingPrice: "100", stock: 40, lowStockThreshold: 10, unit: "pcs" },
    ])
    .returning({ id: products.id });

  console.log(`Added ${inserted.length} products. Existing products and sales history were left untouched.`);
}

addStock()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
