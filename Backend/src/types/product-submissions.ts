import type { ProductItemType, UserProductDto } from "./products.js";

export type ProductSubmissionRow = {
  id: string;
  submitted_by: string;
  product_id: string | null;
  item_type: ProductItemType;
  name: string;
  normalized_name: string;
  brand: string;
  category: string | null;
  ai_extracted_text: string | null;
  confirmed_ingredients_text: string | null;
  status: "draft" | "community" | "verified" | "rejected";
  created_at: string;
  updated_at: string;
};

export type ExtractedIngredientCandidate = {
  rawName: string;
  normalizedName: string;
  matchedIngredientId: string | null;
  matchStatus: "unmatched";
};

export type ProductSubmissionExtractionDto = {
  extractedText: string;
  ingredients: ExtractedIngredientCandidate[];
  warnings: string[];
};

export type ConfirmProductSubmissionDto = {
  submissionId: string;
  productId: string;
  userProduct: UserProductDto;
};
