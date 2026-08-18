import { z } from "zod";
import { extractProductLabel } from "../gateways/openai-product-label.gateway.js";
import {
  attachProductToSubmission,
  createProductSubmission
} from "../repositories/product-submissions.repository.js";
import { updateProductSubmissionLink } from "../repositories/products.repository.js";
import { ApiError } from "../types/http.js";
import type {
  ConfirmProductSubmissionDto,
  ProductSubmissionExtractionDto
} from "../types/product-submissions.js";
import { parseIngredientsText } from "../utils/ingredients-parser.js";
import {
  createCommunityProductWithIngredients,
  saveUserProduct
} from "./products.service.js";

const MAX_LABEL_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LABEL_PHOTO_TYPES = new Set(["image/jpeg", "image/png"]);

const itemTypeSchema = z.enum(["cosmetic", "shower_product", "supplement"]);

const extractInputSchema = z.object({
  itemType: itemTypeSchema
});

const confirmInputSchema = z.object({
  itemType: itemTypeSchema,
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().min(1).max(80),
  category: z.string().trim().max(80).optional().nullable(),
  aiExtractedText: z.string().trim().max(5000).optional().nullable(),
  confirmedIngredientsText: z.string().trim().min(1).max(5000)
});

export const parseProductSubmissionExtractInput = (body: unknown) => extractInputSchema.parse(body);
export const parseProductSubmissionConfirmInput = (body: unknown) => confirmInputSchema.parse(body);

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");

const validateLabelPhoto = (file: Express.Multer.File | undefined): Express.Multer.File => {
  if (!file) {
    throw new ApiError(400, "BAD_REQUEST", "성분표 또는 라벨 사진을 첨부해주세요.");
  }

  if (!ACCEPTED_LABEL_PHOTO_TYPES.has(file.mimetype)) {
    throw new ApiError(400, "BAD_REQUEST", "성분표 또는 라벨 사진은 JPEG 또는 PNG만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_LABEL_PHOTO_BYTES) {
    throw new ApiError(400, "BAD_REQUEST", "성분표 또는 라벨 사진은 5MB 이하만 업로드할 수 있습니다.");
  }

  return file;
};

const uniqueIngredientNames = (ingredientsText: string) => [
  ...new Set(parseIngredientsText(ingredientsText))
];

export const extractProductSubmission = async (
  input: {
    itemType: "cosmetic" | "shower_product" | "supplement";
  },
  file: Express.Multer.File | undefined
): Promise<ProductSubmissionExtractionDto> => {
  const labelPhoto = validateLabelPhoto(file);
  const extracted = await extractProductLabel({
    itemType: input.itemType,
    file: labelPhoto
  });
  const ingredientNames = extracted.ingredients.length > 0
    ? extracted.ingredients
    : uniqueIngredientNames(extracted.extractedText);

  return {
    extractedText: extracted.extractedText,
    ingredients: ingredientNames.map((ingredientName) => ({
      rawName: ingredientName,
      normalizedName: normalizeName(ingredientName),
      matchedIngredientId: null,
      matchStatus: "unmatched"
    })),
    warnings: ["AI 추출 결과는 사용자의 확인 후 저장됩니다."]
  };
};

export const confirmProductSubmission = async (
  userId: string,
  input: {
    itemType: "cosmetic" | "shower_product" | "supplement";
    name: string;
    brand: string;
    category?: string | null;
    aiExtractedText?: string | null;
    confirmedIngredientsText: string;
  }
): Promise<ConfirmProductSubmissionDto> => {
  const ingredientNames = uniqueIngredientNames(input.confirmedIngredientsText);

  if (ingredientNames.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "확정할 성분 또는 원료 텍스트를 입력해주세요.");
  }

  const submission = await createProductSubmission({
    submittedBy: userId,
    itemType: input.itemType,
    name: input.name,
    normalizedName: normalizeName(input.name),
    brand: input.brand,
    category: input.category?.trim() || null,
    aiExtractedText: input.aiExtractedText ?? null,
    confirmedIngredientsText: input.confirmedIngredientsText,
    status: "draft"
  });
  const product = await createCommunityProductWithIngredients({
    itemType: input.itemType,
    name: input.name,
    normalizedName: normalizeName(input.name),
    brand: input.brand,
    category: input.category?.trim() || null,
    ingredientsText: input.confirmedIngredientsText,
    ingredientNames,
    createdFromSubmissionId: submission.id
  });

  await attachProductToSubmission({
    submissionId: submission.id,
    productId: product.id
  });
  await updateProductSubmissionLink({
    submissionId: submission.id,
    productId: product.id
  });

  const userProduct = await saveUserProduct(userId, {
    productId: product.id,
    usageStatus: "past",
    isPastExperience: true,
    pastReactionMemo: null,
    memo: null
  });

  return {
    submissionId: submission.id,
    productId: product.id,
    userProduct
  };
};
