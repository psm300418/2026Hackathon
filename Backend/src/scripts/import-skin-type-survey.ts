import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const sourcePath = path.join(repoRoot, "docs", "DB", "skin_type_question.md");

const QUESTIONNAIRE_VERSION = "baumann_ko_rewrite_v1";
const QUESTIONNAIRE_TITLE = "초기 피부 타입 설문";
const QUESTIONNAIRE_DESCRIPTION =
  "공개 자료를 바탕으로 사용자 응답용 한국어 문안으로 재구성한 비공식 설문입니다.";
const excludedQuestionNumbers = new Set([45, 46, 47, 48]);

const dimensionByQuestionNumber = (questionNumber: number) => {
  if (questionNumber >= 1 && questionNumber <= 11) {
    return "oil_dry";
  }
  if (questionNumber >= 12 && questionNumber <= 29) {
    return "sensitive_resistant";
  }
  if (questionNumber >= 30 && questionNumber <= 43) {
    return "pigmented_non_pigmented";
  }
  if (questionNumber >= 44 && questionNumber <= 64) {
    return "wrinkled_tight";
  }

  throw new Error(`Unsupported skin type question number: ${questionNumber}`);
};

const prefixByDimension = {
  oil_dry: "OD",
  sensitive_resistant: "SR",
  pigmented_non_pigmented: "PN",
  wrinkled_tight: "WT"
} as const;

const defaultScoreByOptionKey: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 2.5
};

type ParsedOption = {
  optionKey: string;
  optionText: string;
  score: number;
  displayOrder: number;
};

type ParsedQuestion = {
  questionKey: string;
  questionNumber: number;
  questionText: string;
  dimension: keyof typeof prefixByDimension;
  displayOrder: number;
  specialRule: string | null;
  options: ParsedOption[];
};

const toQuestionKey = (questionNumber: number, dimension: keyof typeof prefixByDimension) =>
  `${prefixByDimension[dimension]}_${String(questionNumber).padStart(2, "0")}`;

const scoreForOption = (questionNumber: number, optionKey: string) => {
  if (questionNumber === 43) {
    return optionKey === "B" ? 5 : 0;
  }
  if (questionNumber === 64) {
    return optionKey === "B" ? 5 : 0;
  }

  const score = defaultScoreByOptionKey[optionKey];

  if (score === undefined) {
    throw new Error(`Unsupported option key ${optionKey} for Q${questionNumber}`);
  }

  return score;
};

const parseSurveyMarkdown = (content: string): ParsedQuestion[] => {
  const lines = content.split(/\r?\n/);
  const questions: ParsedQuestion[] = [];
  let currentQuestion: ParsedQuestion | null = null;

  for (const line of lines) {
    const questionMatch = /^## Q(\d+)\.\s+(.+)$/.exec(line);

    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      const questionNumber = Number(questionMatch[1]);

      if (excludedQuestionNumbers.has(questionNumber)) {
        currentQuestion = null;
        continue;
      }

      const dimension = dimensionByQuestionNumber(questionNumber);

      currentQuestion = {
        questionKey: toQuestionKey(questionNumber, dimension),
        questionNumber,
        questionText: questionMatch[2].trim(),
        dimension,
        displayOrder: questionNumber,
        specialRule: null,
        options: []
      };
      continue;
    }

    if (!currentQuestion) {
      continue;
    }

    const optionMatch = /^-\s+([A-E])\.\s+(.+)$/.exec(line);

    if (optionMatch) {
      const optionKey = optionMatch[1];
      currentQuestion.options.push({
        optionKey,
        optionText: optionMatch[2].trim(),
        score: scoreForOption(currentQuestion.questionNumber, optionKey),
        displayOrder: currentQuestion.options.length + 1
      });
      continue;
    }

    if (line.includes("별도 가산점 항목")) {
      currentQuestion.specialRule =
        currentQuestion.questionNumber === 43
          ? "option_B_adds_5_points"
          : "option_B_adds_5_points";
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  if (questions.length !== 60) {
    throw new Error(`Expected 60 questions, found ${questions.length}`);
  }

  for (const question of questions) {
    if (question.options.length < 2) {
      throw new Error(`Question ${question.questionKey} has no usable options`);
    }
  }

  return questions;
};

const idRowSchema = z.object({
  id: z.string().uuid()
});

const questionIdRowSchema = z.object({
  id: z.string().uuid(),
  question_key: z.string()
});

const requireNoError = (error: unknown, message: string) => {
  if (error) {
    throw new Error(`${message}: ${JSON.stringify(error)}`);
  }
};

const main = async () => {
  const content = await readFile(sourcePath, "utf8");
  const questions = parseSurveyMarkdown(content);
  const supabase = createSupabaseAdminClient();

  const { data: questionnaireData, error: questionnaireError } = await supabase
    .from("skin_type_questionnaires")
    .upsert(
      {
        version: QUESTIONNAIRE_VERSION,
        title: QUESTIONNAIRE_TITLE,
        description: QUESTIONNAIRE_DESCRIPTION,
        is_active: true
      },
      { onConflict: "version" }
    )
    .select("id")
    .single();

  requireNoError(questionnaireError, "Failed to upsert skin type questionnaire");

  const questionnaire = idRowSchema.parse(questionnaireData);

  const { error: deactivateError } = await supabase
    .from("skin_type_questionnaires")
    .update({ is_active: false })
    .neq("version", QUESTIONNAIRE_VERSION);

  requireNoError(deactivateError, "Failed to deactivate old questionnaires");

  const { error: deleteQuestionsError } = await supabase
    .from("skin_type_questions")
    .delete()
    .eq("questionnaire_id", questionnaire.id);

  requireNoError(deleteQuestionsError, "Failed to delete old skin type questions");

  const questionRows = questions.map((question) => ({
    questionnaire_id: questionnaire.id,
    dimension: question.dimension,
    question_key: question.questionKey,
    question_text: question.questionText,
    display_order: question.displayOrder,
    special_rule: question.specialRule
  }));

  const { error: questionInsertError } = await supabase
    .from("skin_type_questions")
    .insert(questionRows);

  requireNoError(questionInsertError, "Failed to insert skin type questions");

  const { data: questionIdData, error: questionIdError } = await supabase
    .from("skin_type_questions")
    .select("id, question_key")
    .eq("questionnaire_id", questionnaire.id);

  requireNoError(questionIdError, "Failed to fetch inserted skin type questions");

  const questionIds = z.array(questionIdRowSchema).parse(questionIdData);
  const questionIdByKey = new Map(questionIds.map((row) => [row.question_key, row.id]));

  const optionRows = questions.flatMap((question) => {
    const questionId = questionIdByKey.get(question.questionKey);

    if (!questionId) {
      throw new Error(`Missing question id for ${question.questionKey}`);
    }

    return question.options.map((option) => ({
      question_id: questionId,
      option_key: option.optionKey,
      option_text: option.optionText,
      score: option.score,
      display_order: option.displayOrder
    }));
  });

  const { error: optionInsertError } = await supabase.from("skin_type_options").insert(optionRows);

  requireNoError(optionInsertError, "Failed to insert skin type options");

  console.log("Skin type survey import complete");
  console.log(`Questionnaire version: ${QUESTIONNAIRE_VERSION}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Options: ${optionRows.length}`);
};

main().catch((error: unknown) => {
  console.error("Skin type survey import failed");
  console.error(error);
  process.exit(1);
});
