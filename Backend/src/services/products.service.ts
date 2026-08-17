import { z } from "zod";
import {
  findProductById,
  listProductIngredients,
  searchProducts
} from "../repositories/products.repository.js";
import { listUserProducts, upsertUserProduct } from "../repositories/user-products.repository.js";
import { ApiError } from "../types/http.js";
import type {
  ProductIngredientDto,
  ProductIngredientRow,
  ProductRow,
  ProductSearchDto,
  ProductSearchItemDto,
  UsageStatus,
  UserProductDto,
  UserProductRow
} from "../types/products.js";

const MAX_SEARCH_RESULTS = 20;

const productSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "검색어를 입력해주세요.").max(80)
});

const userProductInputSchema = z.object({
  productId: z.string().uuid(),
  usageStatus: z.enum(["current", "past", "paused"]).default("past"),
  isPastExperience: z.boolean().default(true),
  pastReactionMemo: z.string().trim().max(500).optional().nullable(),
  memo: z.string().trim().max(500).optional().nullable()
});

export const parseProductSearchQuery = (query: unknown) => productSearchQuerySchema.parse(query);
export const parseUserProductInput = (body: unknown) => userProductInputSchema.parse(body);

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");

const scoreProduct = (product: ProductRow, rawQuery: string) => {
  const query = normalizeText(rawQuery);
  const name = normalizeText(product.name);
  const normalizedName = normalizeText(product.normalized_name);
  const brand = normalizeText(product.brand);
  const category = normalizeText(product.category ?? "");

  if (name === query || normalizedName === query) {
    return 100;
  }

  if (brand === query) {
    return 90;
  }

  if (name.startsWith(query) || normalizedName.startsWith(query)) {
    return 80;
  }

  if (brand.startsWith(query)) {
    return 70;
  }

  if (name.includes(query) || normalizedName.includes(query)) {
    return 60;
  }

  if (brand.includes(query)) {
    return 50;
  }

  if (category.includes(query)) {
    return 40;
  }

  return 0;
};

const groupIngredientsByProductId = (ingredients: ProductIngredientRow[]) => {
  const ingredientsByProductId = new Map<string, ProductIngredientRow[]>();

  for (const ingredient of ingredients) {
    const existingIngredients = ingredientsByProductId.get(ingredient.product_id) ?? [];
    existingIngredients.push(ingredient);
    ingredientsByProductId.set(ingredient.product_id, existingIngredients);
  }

  return ingredientsByProductId;
};

const toIngredientDto = (ingredient: ProductIngredientRow): ProductIngredientDto => ({
  name: ingredient.raw_name,
  normalizedName: normalizeText(ingredient.raw_name),
  matchedIngredientId: ingredient.ingredient_id,
  matchStatus: ingredient.match_status
});

const toProductSearchItemDto = (
  product: ProductRow,
  ingredientsByProductId: Map<string, ProductIngredientRow[]>
): ProductSearchItemDto => ({
  id: product.id,
  source: product.source,
  verificationStatus: product.verification_status,
  name: product.name,
  brand: product.brand,
  category: product.category,
  ingredientsText: product.ingredients_text,
  ingredients: (ingredientsByProductId.get(product.id) ?? []).map(toIngredientDto)
});

export const searchProductCatalog = async (query: string): Promise<ProductSearchDto> => {
  const products = await searchProducts(query);
  const sortedProducts = [...products]
    .sort((left, right) => {
      const scoreDiff = scoreProduct(right, query) - scoreProduct(left, query);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.name.localeCompare(right.name, "ko");
    })
    .slice(0, MAX_SEARCH_RESULTS);
  const ingredients = await listProductIngredients(sortedProducts.map((product) => product.id));
  const ingredientsByProductId = groupIngredientsByProductId(ingredients);

  return {
    items: sortedProducts.map((product) => toProductSearchItemDto(product, ingredientsByProductId)),
    canSubmitProduct: false
  };
};

const toUserProductDto = (
  userProduct: UserProductRow,
  ingredientsByProductId: Map<string, ProductIngredientRow[]>
): UserProductDto => {
  if (!userProduct.products) {
    throw new ApiError(500, "INTERNAL_ERROR", "등록된 제품 정보를 불러오지 못했습니다.");
  }

  return {
    id: userProduct.id,
    productId: userProduct.product_id,
    usageStatus: userProduct.usage_status,
    startedAt: userProduct.started_at,
    isPastExperience: userProduct.is_past_experience,
    pastReactionMemo: userProduct.past_reaction_memo,
    memo: userProduct.memo,
    createdAt: userProduct.created_at,
    updatedAt: userProduct.updated_at,
    product: toProductSearchItemDto(userProduct.products, ingredientsByProductId)
  };
};

export const saveUserProduct = async (
  userId: string,
  input: {
    productId: string;
    usageStatus: UsageStatus;
    isPastExperience: boolean;
    pastReactionMemo?: string | null;
    memo?: string | null;
  }
): Promise<UserProductDto> => {
  const product = await findProductById(input.productId);

  if (!product) {
    throw new ApiError(404, "NOT_FOUND", "제품을 찾을 수 없습니다.");
  }

  const userProduct = await upsertUserProduct({
    userId,
    productId: input.productId,
    usageStatus: input.usageStatus,
    startedAt: null,
    isPastExperience: input.isPastExperience,
    pastReactionMemo: input.pastReactionMemo ?? null,
    memo: input.memo ?? null
  });
  const ingredients = await listProductIngredients([userProduct.product_id]);

  return toUserProductDto(userProduct, groupIngredientsByProductId(ingredients));
};

export const getUserProducts = async (userId: string): Promise<UserProductDto[]> => {
  const userProducts = await listUserProducts(userId);
  const productIds = userProducts.map((userProduct) => userProduct.product_id);
  const ingredients = await listProductIngredients(productIds);
  const ingredientsByProductId = groupIngredientsByProductId(ingredients);

  return userProducts.map((userProduct) => toUserProductDto(userProduct, ingredientsByProductId));
};
