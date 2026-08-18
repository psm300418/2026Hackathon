import OpenAI from "openai";
import { z } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../types/http.js";
import type { ProductItemType } from "../types/products.js";

const OPENAI_MODEL = "gpt-5.6-sol";

const extractionSchema = z.object({
  extractedText: z.string().trim().default(""),
  ingredients: z.array(z.string().trim().min(1)).default([])
});

const itemTypeLabel = (itemType: ProductItemType) => {
  switch (itemType) {
    case "cosmetic":
      return "화장품 전성분";
    case "shower_product":
      return "샤워용품 전성분 또는 라벨 성분";
    case "supplement":
      return "영양제 원료명, 성분명 또는 영양정보";
  }
};

const toDataUrl = (file: Express.Multer.File) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const parseResponseText = (text: string) => {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/u, "")
    .replace(/^```\s*/u, "")
    .replace(/\s*```$/u, "");
  const parsed: unknown = JSON.parse(withoutFence);
  return extractionSchema.parse(parsed);
};

export const extractProductLabel = async (params: {
  itemType: ProductItemType;
  file: Express.Multer.File;
}): Promise<{
  extractedText: string;
  ingredients: string[];
}> => {
  if (!env.OPENAI_API_KEY) {
    throw new ApiError(500, "CONFIGURATION_ERROR", "OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY
  });

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `${itemTypeLabel(params.itemType)} 사진에서 사용자가 확인할 원문 텍스트와 후보 항목을 추출하세요.`,
              "의학적 판단이나 효능 판단은 하지 마세요.",
              "보이지 않는 내용은 추정하지 말고, 읽기 어려우면 가능한 부분만 반환하세요.",
              "반드시 JSON만 반환하세요.",
              '{"extractedText":"쉼표로 구분된 원문 또는 줄바꿈 원문","ingredients":["후보1","후보2"]}'
            ].join("\n")
          },
          {
            type: "input_image",
            image_url: toDataUrl(params.file),
            detail: "high"
          }
        ]
      }
    ]
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new ApiError(502, "INTERNAL_ERROR", "AI 추출 결과가 비어 있습니다.");
  }

  return parseResponseText(outputText);
};
