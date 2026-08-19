import OpenAI from "openai";
import { z } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../types/http.js";
import type { AnalysisEvidence, GeneratedAnalysis } from "../types/analysis.js";

const OPENAI_MODEL = "gpt-5.6-sol";

const confidenceSchema = z.enum(["strong", "medium", "weak", "data_insufficient"]);

const generatedFindingSchema = z.object({
  name: z.string().trim().min(1),
  evidenceLevel: confidenceSchema,
  reason: z.string().trim().min(1),
  supportingLogs: z.array(z.string().trim().min(1)).max(5).default([])
});

const generatedAnalysisSchema = z.object({
  confidenceLevel: confidenceSchema,
  summary: z.string().trim().min(1),
  positiveSuspectedIngredients: z.array(generatedFindingSchema).max(5).default([]),
  negativeSuspectedIngredients: z.array(generatedFindingSchema).max(5).default([]),
  limitations: z.array(z.string().trim().min(1)).default([]),
  nextRecordsToAdd: z.array(z.string().trim().min(1)).default([])
});

const parseResponseText = (text: string): GeneratedAnalysis => {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/u, "")
    .replace(/^```\s*/u, "")
    .replace(/\s*```$/u, "");
  const parsed: unknown = JSON.parse(withoutFence);
  return generatedAnalysisSchema.parse(parsed);
};

export const generateAnalysisWithOpenAi = async (
  evidence: AnalysisEvidence
): Promise<GeneratedAnalysis> => {
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
        role: "system",
        content: [
          "당신은 개인 피부 기록 앱의 분석 설명문을 생성한다.",
          "의료 진단, 치료 방법, 의약품 사용 지시를 절대 제공하지 않는다.",
          "특정 제품이나 성분이 원인이라고 확정하지 않는다.",
          "반드시 '긍정적 의심 성분 후보', '부정적 의심 성분 후보', '관련 가능성', '기록상 함께 나타남' 같은 완곡한 표현을 사용한다.",
          "추천 성분, 피해야 할 성분, 효과 있음, 원인, 치료 같은 단정 표현은 사용하지 않는다.",
          "요약은 단순 평균 요약보다 notableEvents와 factorSummaries에 기반해 평소 대비 달라진 날과 후보 요인을 먼저 설명한다.",
          "수면, 습도, 온도, 외출, 첫 사용 제품은 원인 확정이 아니라 같은 날 기록된 후보 요인으로만 표현한다.",
          "응답은 JSON만 반환한다."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          "아래 evidence는 Backend가 최근 30일 상세 기록과 전체 기간 압축 통계, 이전 분석 요약을 합쳐 만든 데이터다.",
          "evidence.trendPoints.totalScore는 0-20 범위의 피부 컨디션 점수이며 높을수록 좋은 상태, 낮을수록 건조함/유분/붉음/트러블 기록이 두드러진 상태다.",
          "evidence.notableEvents는 최근 평균보다 피부 컨디션 점수가 낮아진 날짜이며, reasons는 같은 날 함께 기록된 후보 요인이다.",
          "evidence.factorSummaries는 후보 요인이 기록 전체와 특이 변화일에서 얼마나 반복됐는지 요약한 값이다.",
          "성분 후보는 각 방향 최대 5개로 제한하고, 데이터가 부족하면 confidenceLevel을 data_insufficient 또는 weak로 낮춰라.",
          "ingredientStats에서 positiveSignalCount가 negativeSignalCount보다 큰 항목은 긍정 후보로, negativeSignalCount가 positiveSignalCount보다 큰 항목은 부정 후보로 우선 검토한다.",
          "여러 제품에 반복해서 겹치는 일반 계면활성제보다 한 제품 또는 한 루틴 변화에 특징적으로 등장한 성분을 우선한다.",
          "한 방향의 후보가 존재하면 해당 배열을 비우지 말고 최소 1개 이상 반환한다.",
          "생활/환경 요인은 limitations 또는 nextRecordsToAdd에 반영하되 성분 원인처럼 표현하지 마라.",
          "반환 JSON 형식:",
          JSON.stringify({
            confidenceLevel: "data_insufficient",
            summary: "요약",
            positiveSuspectedIngredients: [
              {
                name: "성분명",
                evidenceLevel: "weak",
                reason: "기록상 함께 나타난 근거",
                supportingLogs: ["근거 요약"]
              }
            ],
            negativeSuspectedIngredients: [],
            limitations: ["제한점"],
            nextRecordsToAdd: ["추가로 기록하면 좋은 항목"]
          }),
          "evidence:",
          JSON.stringify(evidence)
        ].join("\n")
      }
    ]
  });

  if (!response.output_text) {
    throw new ApiError(502, "INTERNAL_ERROR", "AI 분석 결과가 비어 있습니다.");
  }

  return parseResponseText(response.output_text);
};
