import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type { ProductItemType } from "../types/products.js";
import type { ProductSubmissionRow } from "../types/product-submissions.js";

const productSubmissionRowSchema = z.object({
  id: z.string().uuid(),
  submitted_by: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  item_type: z.enum(["cosmetic", "shower_product", "supplement"]),
  name: z.string(),
  normalized_name: z.string(),
  brand: z.string(),
  category: z.string().nullable(),
  ai_extracted_text: z.string().nullable(),
  confirmed_ingredients_text: z.string().nullable(),
  status: z.enum(["draft", "community", "verified", "rejected"]),
  created_at: z.string(),
  updated_at: z.string()
});

const productSubmissionColumns = [
  "id",
  "submitted_by",
  "product_id",
  "item_type",
  "name",
  "normalized_name",
  "brand",
  "category",
  "ai_extracted_text",
  "confirmed_ingredients_text",
  "status",
  "created_at",
  "updated_at"
].join(", ");

export const createProductSubmission = async (params: {
  submittedBy: string;
  productId?: string | null;
  itemType: ProductItemType;
  name: string;
  normalizedName: string;
  brand: string;
  category: string | null;
  aiExtractedText?: string | null;
  confirmedIngredientsText: string;
  status: ProductSubmissionRow["status"];
}): Promise<ProductSubmissionRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_submissions")
    .insert({
      submitted_by: params.submittedBy,
      product_id: params.productId ?? null,
      item_type: params.itemType,
      name: params.name,
      normalized_name: params.normalizedName,
      brand: params.brand,
      category: params.category,
      ai_extracted_text: params.aiExtractedText ?? null,
      confirmed_ingredients_text: params.confirmedIngredientsText,
      status: params.status
    })
    .select(productSubmissionColumns)
    .single();

  if (error) {
    throw error;
  }

  return productSubmissionRowSchema.parse(data);
};

export const attachProductToSubmission = async (params: {
  submissionId: string;
  productId: string;
}): Promise<ProductSubmissionRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_submissions")
    .update({
      product_id: params.productId,
      status: "community"
    })
    .eq("id", params.submissionId)
    .select(productSubmissionColumns)
    .single();

  if (error) {
    throw error;
  }

  return productSubmissionRowSchema.parse(data);
};
