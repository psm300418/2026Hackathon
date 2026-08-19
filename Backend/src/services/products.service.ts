import { z } from "zod";
import {
  createCommunityProduct,
  findProductById,
  listProductIngredients,
  replaceProductIngredients,
  searchProducts
} from "../repositories/products.repository.js";
import {
  listLatestUsedDatesByUserProductId,
  listUserProducts,
  updateUserProductStatus,
  updateUserProductStatuses,
  upsertUserProduct
} from "../repositories/user-products.repository.js";
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
const CURRENT_PRODUCT_WINDOW_DAYS = 30;

const productSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "검색어를 입력해주세요.").max(80),
  itemType: z.enum(["cosmetic", "shower_product", "supplement"]).optional()
});

const userProductInputSchema = z.object({
  productId: z.string().uuid(),
  usageStatus: z.enum(["current", "past", "paused"]).default("past"),
  isPastExperience: z.boolean().default(true),
  pastReactionMemo: z.string().trim().max(500).optional().nullable(),
  memo: z.string().trim().max(500).optional().nullable()
});

const userProductStatusInputSchema = z.object({
  usageStatus: z.enum(["current", "past", "paused"])
});

export const parseProductSearchQuery = (query: unknown) => productSearchQuerySchema.parse(query);
export const parseUserProductInput = (body: unknown) => userProductInputSchema.parse(body);
export const parseUserProductStatusInput = (body: unknown) => userProductStatusInputSchema.parse(body);

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
  itemType: product.item_type,
  name: product.name,
  brand: product.brand,
  category: product.category,
  ingredientsText: product.ingredients_text,
  ingredients: (ingredientsByProductId.get(product.id) ?? []).map(toIngredientDto)
});

export const searchProductCatalog = async (input: {
  q: string;
  itemType?: ProductRow["item_type"];
}): Promise<ProductSearchDto> => {
  const products = await searchProducts(input.q, input.itemType);
  const sortedProducts = [...products]
    .sort((left, right) => {
      const scoreDiff = scoreProduct(right, input.q) - scoreProduct(left, input.q);

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
    canSubmitProduct: true
  };
};

export const createCommunityProductWithIngredients = async (params: {
  itemType: ProductRow["item_type"];
  name: string;
  normalizedName: string;
  brand: string;
  category: string | null;
  ingredientsText: string;
  ingredientNames: string[];
  createdFromSubmissionId?: string | null;
}): Promise<ProductRow> => {
  const product = await createCommunityProduct(params);
  await replaceProductIngredients(product.id, params.ingredientNames);
  return product;
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

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const todayInSeoul = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

export const markUserProductsCurrent = async (
  userId: string,
  userProductIds: string[]
): Promise<void> => {
  await updateUserProductStatuses({
    userId,
    userProductIds: [...new Set(userProductIds)],
    usageStatus: "current"
  });
};

const syncCurrentProductsFromUsage = async (userId: string): Promise<void> => {
  const userProducts = await listUserProducts(userId);
  const cutoffDate = toDateString(
    addDays(new Date(`${todayInSeoul()}T00:00:00.000Z`), -(CURRENT_PRODUCT_WINDOW_DAYS - 1))
  );
  const latestUsedDateById = await listLatestUsedDatesByUserProductId(
    userId,
    userProducts.map((userProduct) => userProduct.id)
  );
  const toPastIds = userProducts
    .filter((userProduct) => userProduct.usage_status === "current")
    .filter((userProduct) => {
      const latestUsedDate = latestUsedDateById.get(userProduct.id);
      return !latestUsedDate || latestUsedDate < cutoffDate;
    })
    .map((userProduct) => userProduct.id);

  await updateUserProductStatuses({
    userId,
    userProductIds: toPastIds,
    usageStatus: "past"
  });
};

export const updateUserProductUsageStatus = async (
  userId: string,
  userProductId: string,
  input: z.infer<typeof userProductStatusInputSchema>
): Promise<UserProductDto> => {
  try {
    const userProduct = await updateUserProductStatus({
      userId,
      userProductId,
      usageStatus: input.usageStatus
    });
    const ingredients = await listProductIngredients([userProduct.product_id]);
    return toUserProductDto(userProduct, groupIngredientsByProductId(ingredients));
  } catch (error) {
    if (error instanceof Error && error.message === "USER_PRODUCT_NOT_FOUND") {
      throw new ApiError(404, "NOT_FOUND", "내 제품을 찾을 수 없습니다.");
    }

    throw error;
  }
};

export const getUserProducts = async (userId: string): Promise<UserProductDto[]> => {
  await syncCurrentProductsFromUsage(userId);
  const userProducts = await listUserProducts(userId);
  const productIds = userProducts.map((userProduct) => userProduct.product_id);
  const ingredients = await listProductIngredients(productIds);
  const ingredientsByProductId = groupIngredientsByProductId(ingredients);

  return userProducts.map((userProduct) => toUserProductDto(userProduct, ingredientsByProductId));
};
