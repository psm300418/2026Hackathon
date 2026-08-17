import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type {
  SkinTypeOptionRow,
  SkinTypeQuestionRow,
  SkinTypeQuestionnaireRow,
  SkinTypeResultRow
} from "../types/skin-type.js";

const questionnaireRowSchema = z.object({
  id: z.string().uuid(),
  version: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean()
});

const questionRowSchema = z.object({
  id: z.string().uuid(),
  questionnaire_id: z.string().uuid(),
  dimension: z.enum([
    "oil_dry",
    "sensitive_resistant",
    "pigmented_non_pigmented",
    "wrinkled_tight"
  ]),
  question_key: z.string(),
  question_text: z.string(),
  display_order: z.number(),
  special_rule: z.string().nullable()
});

const optionRowSchema = z.object({
  id: z.string().uuid(),
  question_id: z.string().uuid(),
  option_key: z.string(),
  option_text: z.string(),
  score: z.coerce.number(),
  display_order: z.number()
});

const resultRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  questionnaire_id: z.string().uuid(),
  skin_type_code: z.string(),
  oil_dry_code: z.enum(["O", "D"]),
  oil_dry_score: z.coerce.number(),
  sensitive_resistant_code: z.enum(["S", "R"]),
  sensitive_resistant_score: z.coerce.number(),
  pigmented_non_pigmented_code: z.enum(["P", "N"]),
  pigmented_non_pigmented_score: z.coerce.number(),
  wrinkled_tight_code: z.enum(["W", "T"]),
  wrinkled_tight_score: z.coerce.number(),
  result_notice: z.string(),
  completed_at: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

export const findActiveQuestionnaire = async (): Promise<SkinTypeQuestionnaireRow | null> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("skin_type_questionnaires")
    .select("id, version, title, description, is_active")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? questionnaireRowSchema.parse(data) : null;
};

export const listQuestions = async (
  questionnaireId: string
): Promise<SkinTypeQuestionRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("skin_type_questions")
    .select("id, questionnaire_id, dimension, question_key, question_text, display_order, special_rule")
    .eq("questionnaire_id", questionnaireId)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(questionRowSchema).parse(data);
};

export const listOptions = async (questionIds: string[]): Promise<SkinTypeOptionRow[]> => {
  if (questionIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("skin_type_options")
    .select("id, question_id, option_key, option_text, score, display_order")
    .in("question_id", questionIds)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(optionRowSchema).parse(data);
};

export const createSkinTypeResult = async (params: {
  userId: string;
  questionnaireId: string;
  skinTypeCode: string;
  oilDryCode: "O" | "D";
  oilDryScore: number;
  sensitiveResistantCode: "S" | "R";
  sensitiveResistantScore: number;
  pigmentedNonPigmentedCode: "P" | "N";
  pigmentedNonPigmentedScore: number;
  wrinkledTightCode: "W" | "T";
  wrinkledTightScore: number;
  resultNotice: string;
}): Promise<SkinTypeResultRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("skin_type_results")
    .insert({
      user_id: params.userId,
      questionnaire_id: params.questionnaireId,
      skin_type_code: params.skinTypeCode,
      oil_dry_code: params.oilDryCode,
      oil_dry_score: params.oilDryScore,
      sensitive_resistant_code: params.sensitiveResistantCode,
      sensitive_resistant_score: params.sensitiveResistantScore,
      pigmented_non_pigmented_code: params.pigmentedNonPigmentedCode,
      pigmented_non_pigmented_score: params.pigmentedNonPigmentedScore,
      wrinkled_tight_code: params.wrinkledTightCode,
      wrinkled_tight_score: params.wrinkledTightScore,
      result_notice: params.resultNotice
    })
    .select(
      [
        "id",
        "user_id",
        "questionnaire_id",
        "skin_type_code",
        "oil_dry_code",
        "oil_dry_score",
        "sensitive_resistant_code",
        "sensitive_resistant_score",
        "pigmented_non_pigmented_code",
        "pigmented_non_pigmented_score",
        "wrinkled_tight_code",
        "wrinkled_tight_score",
        "result_notice",
        "completed_at",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .single();

  if (error) {
    throw error;
  }

  return resultRowSchema.parse(data);
};

export const createSkinTypeResponses = async (
  responses: {
    skinTypeResultId: string;
    userId: string;
    questionId: string;
    optionId: string;
    score: number;
  }[]
) => {
  if (responses.length === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("skin_type_responses").insert(
    responses.map((response) => ({
      skin_type_result_id: response.skinTypeResultId,
      user_id: response.userId,
      question_id: response.questionId,
      option_id: response.optionId,
      score: response.score
    }))
  );

  if (error) {
    throw error;
  }
};

export const findLatestSkinTypeResult = async (
  userId: string
): Promise<SkinTypeResultRow | null> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("skin_type_results")
    .select(
      [
        "id",
        "user_id",
        "questionnaire_id",
        "skin_type_code",
        "oil_dry_code",
        "oil_dry_score",
        "sensitive_resistant_code",
        "sensitive_resistant_score",
        "pigmented_non_pigmented_code",
        "pigmented_non_pigmented_score",
        "wrinkled_tight_code",
        "wrinkled_tight_score",
        "result_notice",
        "completed_at",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? resultRowSchema.parse(data) : null;
};
