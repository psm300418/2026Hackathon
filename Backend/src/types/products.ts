export type ProductSource = "seed" | "community" | "admin";
export type ProductVerificationStatus = "community" | "verified" | "needs_review";
export type IngredientMatchStatus = "matched" | "unmatched" | "manual";
export type UsageStatus = "current" | "past" | "paused";

export type ProductRow = {
  id: string;
  source: ProductSource;
  name: string;
  normalized_name: string;
  brand: string;
  category: string | null;
  ingredients_text: string | null;
  verification_status: ProductVerificationStatus;
  created_at: string;
  updated_at: string;
};

export type ProductIngredientRow = {
  id: string;
  product_id: string;
  ingredient_id: string | null;
  raw_name: string;
  display_order: number;
  match_status: IngredientMatchStatus;
};

export type UserProductRow = {
  id: string;
  user_id: string;
  product_id: string;
  usage_status: UsageStatus;
  started_at: string | null;
  is_past_experience: boolean;
  past_reaction_memo: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  products: ProductRow | null;
};

export type ProductIngredientDto = {
  name: string;
  normalizedName: string;
  matchedIngredientId: string | null;
  matchStatus: IngredientMatchStatus;
};

export type ProductSearchItemDto = {
  id: string;
  source: ProductSource;
  verificationStatus: ProductVerificationStatus;
  name: string;
  brand: string;
  category: string | null;
  ingredientsText: string | null;
  ingredients: ProductIngredientDto[];
};

export type ProductSearchDto = {
  items: ProductSearchItemDto[];
  canSubmitProduct: false;
};

export type UserProductDto = {
  id: string;
  productId: string;
  usageStatus: UsageStatus;
  startedAt: string | null;
  isPastExperience: boolean;
  pastReactionMemo: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  product: ProductSearchItemDto;
};
