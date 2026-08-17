import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, "../..");
const seedDir = path.join(backendRoot, "supabase", "seed");

const productSeedSchema = z.array(
  z.object({
    externalId: z.string().min(1),
    source: z.literal("seed"),
    seedBatch: z.string().min(1),
    seedOrder: z.number().int().positive(),
    name: z.string().min(1),
    normalizedName: z.string().min(1),
    brand: z.string().min(1),
    category: z.string().min(1),
    ingredientsText: z.string().min(1),
    verificationStatus: z.literal("verified"),
    sourceUrl: z.string().url(),
    sourceCheckedAt: z.string().min(1),
    region: z.literal("KR"),
    formulaVersion: z.string().min(1)
  })
);

const productIngredientSeedSchema = z.array(
  z.object({
    productExternalId: z.string().min(1),
    rawName: z.string().min(1),
    ingredientNameCandidate: z.string().min(1),
    displayOrder: z.number().int().positive(),
    amountText: z.string().nullable(),
    amountStatus: z.enum(["known", "unknown"]),
    matchStatus: z.literal("unmatched")
  })
);

const productIdRowSchema = z.object({
  id: z.string().uuid(),
  external_id: z.string()
});

type ProductSeed = z.infer<typeof productSeedSchema>[number];
type ProductIngredientSeed = z.infer<typeof productIngredientSeedSchema>[number];
type ProductIdRow = z.infer<typeof productIdRowSchema>;

type ProductInsertRow = {
  source: ProductSeed["source"];
  external_id: string;
  name: string;
  normalized_name: string;
  brand: string;
  category: string;
  ingredients_text: string;
  verification_status: ProductSeed["verificationStatus"];
  source_url: string;
  source_checked_at: string;
  region: ProductSeed["region"];
  formula_version: string;
  seed_batch: string;
};

type ProductIngredientInsertRow = {
  product_id: string;
  ingredient_id: null;
  raw_name: string;
  display_order: number;
  amount_text: string | null;
  amount_status: ProductIngredientSeed["amountStatus"];
  match_status: ProductIngredientSeed["matchStatus"];
};

const readJson = async (fileName: string): Promise<unknown> => {
  const content = await readFile(path.join(seedDir, fileName), "utf8");
  return JSON.parse(content) as unknown;
};

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const toProductRow = (product: ProductSeed): ProductInsertRow => ({
  source: product.source,
  external_id: product.externalId,
  name: product.name,
  normalized_name: product.normalizedName,
  brand: product.brand,
  category: product.category,
  ingredients_text: product.ingredientsText,
  verification_status: product.verificationStatus,
  source_url: product.sourceUrl,
  source_checked_at: product.sourceCheckedAt,
  region: product.region,
  formula_version: product.formulaVersion,
  seed_batch: product.seedBatch
});

const toProductIngredientRow = (
  ingredient: ProductIngredientSeed,
  productIdByExternalId: Map<string, string>
): ProductIngredientInsertRow => {
  const productId = productIdByExternalId.get(ingredient.productExternalId);

  if (!productId) {
    throw new Error(`Product id not found for ${ingredient.productExternalId}`);
  }

  return {
    product_id: productId,
    ingredient_id: null,
    raw_name: ingredient.rawName,
    display_order: ingredient.displayOrder,
    amount_text: ingredient.amountText,
    amount_status: ingredient.amountStatus,
    match_status: ingredient.matchStatus
  };
};

const requireNoSupabaseError = (error: unknown, message: string) => {
  if (error) {
    throw new Error(`${message}: ${JSON.stringify(error)}`);
  }
};

const assertSeedTablesReady = async (supabase: ReturnType<typeof createSupabaseAdminClient>) => {
  const productCheck = await supabase.from("products").select("id").limit(1);
  const productIngredientCheck = await supabase
    .from("product_ingredients")
    .select("id")
    .limit(1);

  if (productCheck.error || productIngredientCheck.error) {
    throw new Error(
      [
        "Seed tables are not ready.",
        "Run Backend/supabase/migrations/202608170001_create_product_seed_tables.sql in Supabase SQL Editor first.",
        `products check: ${JSON.stringify(productCheck.error)}`,
        `product_ingredients check: ${JSON.stringify(productIngredientCheck.error)}`
      ].join(" ")
    );
  }
};

const main = async () => {
  const products = productSeedSchema.parse(await readJson("product_seed.products.json"));
  const productIngredients = productIngredientSeedSchema.parse(
    await readJson("product_seed.product_ingredients.json")
  );
  const supabase = createSupabaseAdminClient();
  const productRows = products.map(toProductRow);

  await assertSeedTablesReady(supabase);

  console.log(`Importing ${productRows.length} products`);

  for (const productBatch of chunk(productRows, 100)) {
    const { error } = await supabase
      .from("products")
      .upsert(productBatch, { onConflict: "external_id" });

    requireNoSupabaseError(error, "Failed to upsert products");
  }

  const productIdRows: ProductIdRow[] = [];
  const productExternalIds = products.map((product) => product.externalId);

  for (const externalIdBatch of chunk(productExternalIds, 100)) {
    const { data, error } = await supabase
      .from("products")
      .select("id, external_id")
      .in("external_id", externalIdBatch);

    requireNoSupabaseError(error, "Failed to fetch product ids");
    productIdRows.push(...z.array(productIdRowSchema).parse(data));
  }

  const productIdByExternalId = new Map(
    productIdRows.map((row) => [row.external_id, row.id] as const)
  );

  if (productIdByExternalId.size !== products.length) {
    throw new Error(
      `Product id count mismatch. expected=${products.length}, actual=${productIdByExternalId.size}`
    );
  }

  const productIds = [...productIdByExternalId.values()];

  console.log("Replacing existing seed product ingredient rows");

  for (const productIdBatch of chunk(productIds, 100)) {
    const { error } = await supabase
      .from("product_ingredients")
      .delete()
      .in("product_id", productIdBatch);

    requireNoSupabaseError(error, "Failed to delete existing product ingredients");
  }

  const productIngredientRows = productIngredients.map((ingredient) =>
    toProductIngredientRow(ingredient, productIdByExternalId)
  );

  console.log(`Importing ${productIngredientRows.length} product ingredient rows`);

  for (const ingredientBatch of chunk(productIngredientRows, 500)) {
    const { error } = await supabase.from("product_ingredients").insert(ingredientBatch);

    requireNoSupabaseError(error, "Failed to insert product ingredients");
  }

  console.log("Product seed import complete");
};

main().catch((error: unknown) => {
  console.error("Product seed import failed");
  console.error(error);
  process.exit(1);
});
