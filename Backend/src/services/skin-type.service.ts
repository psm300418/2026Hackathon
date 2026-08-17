import { z } from "zod";
import { updateProfileSkinType } from "../repositories/profiles.repository.js";
import {
  createSkinTypeResponses,
  createSkinTypeResult,
  findActiveQuestionnaire,
  findLatestSkinTypeResult,
  listOptions,
  listQuestions
} from "../repositories/skin-type.repository.js";
import { getOrCreateProfile } from "./profiles.service.js";
import { ApiError } from "../types/http.js";
import type {
  SkinTypeDimension,
  SkinTypeDimensionDtoKey,
  SkinTypeOptionRow,
  SkinTypeQuestionRow,
  SkinTypeQuestionsDto,
  SkinTypeResponseInput,
  SkinTypeResultDto,
  SkinTypeResultRow
} from "../types/skin-type.js";

const NOTICE = "이 결과는 의료 진단이 아니라 이후 기록 분석을 위한 초기 기준점입니다.";

const sectionTitleByDimension: Record<SkinTypeDimension, string> = {
  oil_dry: "피부의 유분/건조 정도",
  sensitive_resistant: "피부의 민감도",
  pigmented_non_pigmented: "색소침착 경향",
  wrinkled_tight: "주름/탄력 경향"
};

const dimensionOrder: SkinTypeDimension[] = [
  "oil_dry",
  "sensitive_resistant",
  "pigmented_non_pigmented",
  "wrinkled_tight"
];

const dtoKeyByDimension: Record<SkinTypeDimension, SkinTypeDimensionDtoKey> = {
  oil_dry: "oilDry",
  sensitive_resistant: "sensitiveResistant",
  pigmented_non_pigmented: "pigmentedNonPigmented",
  wrinkled_tight: "wrinkledTight"
};

const labelByCode = {
  O: "지성 경향",
  D: "건성 경향",
  S: "민감성 경향",
  R: "저항성 경향",
  P: "색소침착 경향",
  N: "비색소성 경향",
  W: "주름 경향",
  T: "탄력 유지 경향"
} as const;

const responseInputSchema = z.object({
  questionnaireVersion: z.string().min(1),
  responses: z
    .array(
      z.object({
        questionId: z.string().min(1),
        optionId: z.string().min(1)
      })
    )
    .min(1)
});

export const parseSkinTypeResponseInput = (body: unknown) => responseInputSchema.parse(body);

const groupOptionsByQuestionId = (options: SkinTypeOptionRow[]) => {
  const optionsByQuestionId = new Map<string, SkinTypeOptionRow[]>();

  for (const option of options) {
    const existingOptions = optionsByQuestionId.get(option.question_id) ?? [];
    existingOptions.push(option);
    optionsByQuestionId.set(option.question_id, existingOptions);
  }

  return optionsByQuestionId;
};

export const getSkinTypeQuestions = async (): Promise<SkinTypeQuestionsDto> => {
  const questionnaire = await findActiveQuestionnaire();

  if (!questionnaire) {
    throw new ApiError(500, "CONFIGURATION_ERROR", "활성 피부 타입 설문이 없습니다.");
  }

  const questions = await listQuestions(questionnaire.id);
  const options = await listOptions(questions.map((question) => question.id));
  const optionsByQuestionId = groupOptionsByQuestionId(options);

  return {
    version: questionnaire.version,
    title: questionnaire.title,
    description: questionnaire.description,
    sections: dimensionOrder.map((dimension) => ({
      dimension,
      title: sectionTitleByDimension[dimension],
      questions: questions
        .filter((question) => question.dimension === dimension)
        .map((question) => ({
          id: question.question_key,
          text: question.question_text,
          options: (optionsByQuestionId.get(question.id) ?? []).map((option) => ({
            id: option.option_key,
            text: option.option_text
          }))
        }))
    }))
  };
};

const getOilDryCode = (score: number): "O" | "D" => (score >= 27 ? "O" : "D");
const getSensitiveResistantCode = (score: number): "S" | "R" => (score >= 30 ? "S" : "R");
const getPigmentedNonPigmentedCode = (score: number): "P" | "N" =>
  score >= 29 ? "P" : "N";
const getWrinkledTightCode = (score: number): "W" | "T" => (score >= 41 ? "W" : "T");

const sumScoresByDimension = (
  questions: SkinTypeQuestionRow[],
  selectedOptionByQuestionId: Map<string, SkinTypeOptionRow>
) => {
  const scores = new Map<SkinTypeDimension, number>(
    dimensionOrder.map((dimension) => [dimension, 0])
  );

  for (const question of questions) {
    const selectedOption = selectedOptionByQuestionId.get(question.id);

    if (!selectedOption) {
      throw new ApiError(400, "BAD_REQUEST", "모든 설문 문항에 응답해주세요.");
    }

    scores.set(question.dimension, (scores.get(question.dimension) ?? 0) + selectedOption.score);
  }

  return scores;
};

const toResultDto = (result: SkinTypeResultRow): SkinTypeResultDto => {
  const oilDry = {
    code: result.oil_dry_code,
    label: labelByCode[result.oil_dry_code],
    score: result.oil_dry_score
  };
  const sensitiveResistant = {
    code: result.sensitive_resistant_code,
    label: labelByCode[result.sensitive_resistant_code],
    score: result.sensitive_resistant_score
  };
  const pigmentedNonPigmented = {
    code: result.pigmented_non_pigmented_code,
    label: labelByCode[result.pigmented_non_pigmented_code],
    score: result.pigmented_non_pigmented_score
  };
  const wrinkledTight = {
    code: result.wrinkled_tight_code,
    label: labelByCode[result.wrinkled_tight_code],
    score: result.wrinkled_tight_score
  };

  return {
    skinTypeCode: result.skin_type_code,
    displayName: [
      oilDry.label,
      sensitiveResistant.label,
      pigmentedNonPigmented.label,
      wrinkledTight.label
    ].join(" · "),
    dimensions: {
      oilDry,
      sensitiveResistant,
      pigmentedNonPigmented,
      wrinkledTight
    },
    notice: result.result_notice,
    completedAt: result.completed_at
  };
};

export const submitSkinTypeResponses = async (
  userId: string,
  input: {
    questionnaireVersion: string;
    responses: SkinTypeResponseInput[];
  }
): Promise<SkinTypeResultDto> => {
  const questionnaire = await findActiveQuestionnaire();

  if (!questionnaire) {
    throw new ApiError(500, "CONFIGURATION_ERROR", "활성 피부 타입 설문이 없습니다.");
  }

  await getOrCreateProfile(userId);

  if (questionnaire.version !== input.questionnaireVersion) {
    throw new ApiError(400, "BAD_REQUEST", "설문 버전이 올바르지 않습니다.");
  }

  const questions = await listQuestions(questionnaire.id);
  const options = await listOptions(questions.map((question) => question.id));
  const questionByKey = new Map(questions.map((question) => [question.question_key, question]));
  const optionByQuestionAndKey = new Map(
    options.map((option) => [`${option.question_id}:${option.option_key}`, option])
  );
  const selectedOptionByQuestionId = new Map<string, SkinTypeOptionRow>();

  if (input.responses.length !== questions.length) {
    throw new ApiError(400, "BAD_REQUEST", "모든 설문 문항에 응답해주세요.");
  }

  for (const response of input.responses) {
    const question = questionByKey.get(response.questionId);

    if (!question) {
      throw new ApiError(400, "BAD_REQUEST", "알 수 없는 설문 문항이 포함되어 있습니다.");
    }

    const option = optionByQuestionAndKey.get(`${question.id}:${response.optionId}`);

    if (!option) {
      throw new ApiError(400, "BAD_REQUEST", "알 수 없는 설문 선택지가 포함되어 있습니다.");
    }

    if (selectedOptionByQuestionId.has(question.id)) {
      throw new ApiError(400, "BAD_REQUEST", "중복된 설문 응답이 포함되어 있습니다.");
    }

    selectedOptionByQuestionId.set(question.id, option);
  }

  const scores = sumScoresByDimension(questions, selectedOptionByQuestionId);
  const oilDryScore = scores.get("oil_dry") ?? 0;
  const sensitiveResistantScore = scores.get("sensitive_resistant") ?? 0;
  const pigmentedNonPigmentedScore = scores.get("pigmented_non_pigmented") ?? 0;
  const wrinkledTightScore = scores.get("wrinkled_tight") ?? 0;
  const oilDryCode = getOilDryCode(oilDryScore);
  const sensitiveResistantCode = getSensitiveResistantCode(sensitiveResistantScore);
  const pigmentedNonPigmentedCode = getPigmentedNonPigmentedCode(pigmentedNonPigmentedScore);
  const wrinkledTightCode = getWrinkledTightCode(wrinkledTightScore);
  const skinTypeCode = `${oilDryCode}${sensitiveResistantCode}${pigmentedNonPigmentedCode}${wrinkledTightCode}`;

  const result = await createSkinTypeResult({
    userId,
    questionnaireId: questionnaire.id,
    skinTypeCode,
    oilDryCode,
    oilDryScore,
    sensitiveResistantCode,
    sensitiveResistantScore,
    pigmentedNonPigmentedCode,
    pigmentedNonPigmentedScore,
    wrinkledTightCode,
    wrinkledTightScore,
    resultNotice: NOTICE
  });

  await createSkinTypeResponses(
    questions.map((question) => {
      const option = selectedOptionByQuestionId.get(question.id);

      if (!option) {
        throw new ApiError(400, "BAD_REQUEST", "모든 설문 문항에 응답해주세요.");
      }

      return {
        skinTypeResultId: result.id,
        userId,
        questionId: question.id,
        optionId: option.id,
        score: option.score
      };
    })
  );

  await updateProfileSkinType({
    userId,
    skinTypeCode,
    completedAt: result.completed_at
  });

  return toResultDto(result);
};

export const getLatestSkinTypeResult = async (
  userId: string
): Promise<SkinTypeResultDto | null> => {
  const result = await findLatestSkinTypeResult(userId);
  return result ? toResultDto(result) : null;
};
