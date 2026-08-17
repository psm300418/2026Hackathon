import { z } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../types/http.js";

const mfdsIngredientItemSchema = z.object({
  INGR_KOR_NAME: z.string().nullable(),
  INGR_ENG_NAME: z.string().nullable(),
  CAS_NO: z.string().nullable(),
  ORIGIN_MAJOR_KOR_NAME: z.string().nullable(),
  INGR_SYNONYM: z.string().nullable()
});

const mfdsIngredientResponseSchema = z.object({
  header: z.object({
    resultCode: z.string(),
    resultMsg: z.string()
  }),
  body: z.object({
    pageNo: z.number(),
    totalCount: z.number(),
    numOfRows: z.number(),
    items: z.array(mfdsIngredientItemSchema).default([])
  })
});

export type MfdsIngredientItem = z.infer<typeof mfdsIngredientItemSchema>;

export type NormalizedIngredient = {
  source: "mfds";
  externalId: string;
  name: string;
  normalizedName: string;
  englishName: string | null;
  casNo: string | null;
  definition: string | null;
  synonyms: string[];
};

const splitSynonyms = (value: string | null) =>
  value
    ?.split(/[,;/]/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const normalizeIngredient = (item: MfdsIngredientItem): NormalizedIngredient | null => {
  if (!item.INGR_KOR_NAME) {
    return null;
  }

  return {
    source: "mfds",
    externalId: item.INGR_KOR_NAME,
    name: item.INGR_KOR_NAME,
    normalizedName: item.INGR_KOR_NAME.trim().toLowerCase(),
    englishName: item.INGR_ENG_NAME,
    casNo: item.CAS_NO,
    definition: item.ORIGIN_MAJOR_KOR_NAME,
    synonyms: splitSynonyms(item.INGR_SYNONYM)
  };
};

export const listMfdsIngredients = async (options?: {
  pageNo?: number;
  numOfRows?: number;
}) => {
  if (!env.MFDS_API_KEY) {
    throw new ApiError(500, "CONFIGURATION_ERROR", "MFDS_API_KEY가 설정되지 않았습니다.");
  }

  const url = new URL(
    `${env.MFDS_INGREDIENTS_ENDPOINT}/getCsmtcsIngdCpntInfoService01`
  );

  url.searchParams.set("serviceKey", decodeURIComponent(env.MFDS_API_KEY));
  url.searchParams.set("pageNo", String(options?.pageNo ?? 1));
  url.searchParams.set("numOfRows", String(options?.numOfRows ?? 20));
  url.searchParams.set("type", "json");

  const response = await fetch(url);
  const payload: unknown = await response.json();
  const parsed = mfdsIngredientResponseSchema.safeParse(payload);

  if (!response.ok || !parsed.success) {
    throw new ApiError(502, "INTERNAL_ERROR", "MFDS 성분 API 응답을 처리하지 못했습니다.");
  }

  if (parsed.data.header.resultCode !== "00") {
    throw new ApiError(502, "INTERNAL_ERROR", parsed.data.header.resultMsg);
  }

  return {
    pageNo: parsed.data.body.pageNo,
    totalCount: parsed.data.body.totalCount,
    numOfRows: parsed.data.body.numOfRows,
    items: parsed.data.body.items
      .map(normalizeIngredient)
      .filter((item): item is NormalizedIngredient => item !== null)
  };
};

