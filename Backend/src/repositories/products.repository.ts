import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type { ProductIngredientRow, ProductRow } from "../types/products.js";

const productRowSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(["seed", "community", "admin"]),
  item_type: z.enum(["cosmetic", "shower_product", "supplement"]),
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

const productSelectColumns = [
  "id",
  "source",
  "item_type",
  "name",
  "normalized_name",
  "brand",
  "category",
  "ingredients_text",
  "verification_status",
  "created_at",
  "updated_at"
].join(", ");

export const searchProducts = async (
  query: string,
  itemType?: ProductRow["item_type"]
): Promise<ProductRow[]> => {
  const supabase = createSupabaseAdminClient();
  const escapedQuery = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
  const pattern = `%${escapedQuery}%`;

  let request = supabase
    .from("products")
    .select(productSelectColumns)
    .or(
      [
        `name.ilike.${pattern}`,
        `normalized_name.ilike.${pattern}`,
        `brand.ilike.${pattern}`,
        `category.ilike.${pattern}`
      ].join(",")
    )
    .limit(60);

  if (itemType) {
    request = request.eq("item_type", itemType);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return z.array(productRowSchema).parse(data);
};

export const findProductById = async (productId: string): Promise<ProductRow | null> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(productSelectColumns)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? productRowSchema.parse(data) : null;
};

export const createCommunityProduct = async (params: {
  itemType: ProductRow["item_type"];
  name: string;
  normalizedName: string;
  brand: string;
  category: string | null;
  ingredientsText: string;
  createdFromSubmissionId?: string | null;
}): Promise<ProductRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      source: "community",
      item_type: params.itemType,
      name: params.name,
      normalized_name: params.normalizedName,
      brand: params.brand,
      category: params.category,
      ingredients_text: params.ingredientsText,
      verification_status: "community",
      created_from_submission_id: params.createdFromSubmissionId ?? null
    })
    .select(productSelectColumns)
    .single();

  if (error) {
    throw error;
  }

  return productRowSchema.parse(data);
};

export const updateProductSubmissionLink = async (params: {
  productId: string;
  submissionId: string;
}): Promise<void> => {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ created_from_submission_id: params.submissionId })
    .eq("id", params.productId);

  if (error) {
    throw error;
  }
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

export const replaceProductIngredients = async (
  productId: string,
  rawNames: string[]
): Promise<ProductIngredientRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("product_ingredients")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    throw deleteError;
  }

  if (rawNames.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_ingredients")
    .insert(
      rawNames.map((rawName, index) => ({
        product_id: productId,
        raw_name: rawName,
        display_order: index + 1,
        match_status: "unmatched"
      }))
    )
    .select("id, product_id, ingredient_id, raw_name, display_order, match_status")
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(productIngredientRowSchema).parse(data);
};
