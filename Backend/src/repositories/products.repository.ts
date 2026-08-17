import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type { ProductIngredientRow, ProductRow } from "../types/products.js";

const productRowSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(["seed", "community", "admin"]),
  name: z.string(),
  normalized_name: z.string(),
  brand: z.string(),
  category: z.string().nullable(),
  ingredients_text: z.string().nullable(),
  verification_status: z.enum(["community", "verified", "needs_review"]),
  created_at: z.string(),
  updated_at: z.string()
});

const productIngredientRowSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  ingredient_id: z.string().uuid().nullable(),
  raw_name: z.string(),
  display_order: z.coerce.number(),
  match_status: z.enum(["matched", "unmatched", "manual"])
});

export const searchProducts = async (query: string): Promise<ProductRow[]> => {
  const supabase = createSupabaseAdminClient();
  const escapedQuery = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
  const pattern = `%${escapedQuery}%`;

  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "source",
        "name",
        "normalized_name",
        "brand",
        "category",
        "ingredients_text",
        "verification_status",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .or(
      [
        `name.ilike.${pattern}`,
        `normalized_name.ilike.${pattern}`,
        `brand.ilike.${pattern}`,
        `category.ilike.${pattern}`
      ].join(",")
    )
    .limit(60);

  if (error) {
    throw error;
  }

  return z.array(productRowSchema).parse(data);
};

export const findProductById = async (productId: string): Promise<ProductRow | null> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "source",
        "name",
        "normalized_name",
        "brand",
        "category",
        "ingredients_text",
        "verification_status",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? productRowSchema.parse(data) : null;
};

export const listProductIngredients = async (
  productIds: string[]
): Promise<ProductIngredientRow[]> => {
  if (productIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_ingredients")
    .select("id, product_id, ingredient_id, raw_name, display_order, match_status")
    .in("product_id", productIds)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(productIngredientRowSchema).parse(data);
};
