export type SkinTypeDimension =
  | "oil_dry"
  | "sensitive_resistant"
  | "pigmented_non_pigmented"
  | "wrinkled_tight";

export type SkinTypeDimensionDtoKey =
  | "oilDry"
  | "sensitiveResistant"
  | "pigmentedNonPigmented"
  | "wrinkledTight";

export type SkinTypeQuestionnaireRow = {
  id: string;
  version: string;
  title: string;
  description: string | null;
  is_active: boolean;
};

export type SkinTypeQuestionRow = {
  id: string;
  questionnaire_id: string;
  dimension: SkinTypeDimension;
  question_key: string;
  question_text: string;
  display_order: number;
  special_rule: string | null;
};

export type SkinTypeOptionRow = {
  id: string;
  question_id: string;
  option_key: string;
  option_text: string;
  score: number;
  display_order: number;
};

export type SkinTypeResultRow = {
  id: string;
  user_id: string;
  questionnaire_id: string;
  skin_type_code: string;
  oil_dry_code: "O" | "D";
  oil_dry_score: number;
  sensitive_resistant_code: "S" | "R";
  sensitive_resistant_score: number;
  pigmented_non_pigmented_code: "P" | "N";
  pigmented_non_pigmented_score: number;
  wrinkled_tight_code: "W" | "T";
  wrinkled_tight_score: number;
  result_notice: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
};

export type SkinTypeResponseInput = {
  questionId: string;
  optionId: string;
};

export type SkinTypeKnownDimensionsInput = {
  oilDry?: "O" | "D";
  sensitiveResistant?: "S" | "R";
  pigmentedNonPigmented?: "P" | "N";
  wrinkledTight?: "W" | "T";
};

export type SkinTypeQuestionDto = {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
  }[];
};

export type SkinTypeQuestionsDto = {
  version: string;
  title: string;
  description: string | null;
  sections: {
    dimension: SkinTypeDimension;
    title: string;
    questions: SkinTypeQuestionDto[];
  }[];
};

export type SkinTypeDimensionResultDto = {
  code: string;
  label: string;
  score: number;
};

export type SkinTypeResultDto = {
  skinTypeCode: string;
  displayName: string;
  dimensions: Record<SkinTypeDimensionDtoKey, SkinTypeDimensionResultDto>;
  notice: string;
  completedAt: string;
};
