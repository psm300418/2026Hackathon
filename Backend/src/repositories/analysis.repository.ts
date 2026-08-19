import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type {
  AnalysisConfidenceLevel,
  AnalysisFindingRow,
  AnalysisFindingType,
  AnalysisFactorSummary,
  AnalysisNotableEvent,
  AnalysisTrendPoint,
  AnalysisRunRow
} from "../types/analysis.js";

const confidenceSchema = z.enum(["strong", "medium", "weak", "data_insufficient"]);
const findingTypeSchema = z.enum(["positive_suspect", "negative_suspect"]);

const stringArraySchema = z.preprocess(
  (value) => (Array.isArray(value) ? value.map((item) => String(item)) : []),
  z.array(z.string())
);

const trendPointSchema = z.object({
  date: z.string(),
  totalScore: z.coerce.number(),
  dryness: z.coerce.number(),
  oiliness: z.coerce.number(),
  redness: z.coerce.number(),
  trouble: z.coerce.number(),
  sleepHours: z.coerce.number(),
  outdoorMinutes: z.coerce.number().nullable(),
  humidityPercent: z.coerce.number().nullable(),
  temperatureCelsius: z.coerce.number().nullable()
});

const factorTagSchema = z.enum([
  "low_sleep",
  "high_humidity",
  "low_humidity",
  "high_temperature",
  "long_outdoor",
  "rain",
  "first_product_use",
  "product_change"
]);

const notableEventSchema = z.object({
  date: z.string(),
  title: z.string(),
  severity: z.enum(["medium", "high"]),
  totalScore: z.coerce.number(),
  baselineScore: z.coerce.number(),
  scoreDelta: z.coerce.number(),
  factorTags: z.array(factorTagSchema),
  reasons: z.array(z.string()),
  productNames: z.array(z.string())
});

const factorSummarySchema = z.object({
  factorTag: factorTagSchema,
  label: z.string(),
  hitCount: z.coerce.number(),
  eventCount: z.coerce.number(),
  description: z.string()
});

const jsonArraySchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(schema));

const analysisRunRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  requested_at: z.string(),
  confidence_level: confidenceSchema,
  summary: z.string(),
  trend_points: jsonArraySchema(trendPointSchema),
  notable_events: jsonArraySchema(notableEventSchema),
  factor_summaries: jsonArraySchema(factorSummarySchema),
  limitations: stringArraySchema,
  next_records_to_add: stringArraySchema,
  created_at: z.string()
});

const analysisFindingRowSchema = z.object({
  id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  finding_type: findingTypeSchema,
  ingredient_id: z.string().uuid().nullable(),
  ingredient_name: z.string(),
  evidence_level: confidenceSchema,
  reason: z.string(),
  supporting_logs: stringArraySchema,
  created_at: z.string()
});

const analysisRunSelect = [
  "id",
  "user_id",
  "requested_at",
  "confidence_level",
  "summary",
  "trend_points",
  "notable_events",
  "factor_summaries",
  "limitations",
  "next_records_to_add",
  "created_at"
].join(", ");

const analysisFindingSelect = [
  "id",
  "analysis_run_id",
  "finding_type",
  "ingredient_id",
  "ingredient_name",
  "evidence_level",
  "reason",
  "supporting_logs",
  "created_at"
].join(", ");

export const createAnalysisRun = async (params: {
  userId: string;
  confidenceLevel: AnalysisConfidenceLevel;
  summary: string;
  trendPoints: AnalysisTrendPoint[];
  notableEvents: AnalysisNotableEvent[];
  factorSummaries: AnalysisFactorSummary[];
  limitations: string[];
  nextRecordsToAdd: string[];
}): Promise<AnalysisRunRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("analysis_runs")
    .insert({
      user_id: params.userId,
      confidence_level: params.confidenceLevel,
      summary: params.summary,
      trend_points: params.trendPoints,
      notable_events: params.notableEvents,
      factor_summaries: params.factorSummaries,
      limitations: params.limitations,
      next_records_to_add: params.nextRecordsToAdd
    })
    .select(analysisRunSelect)
    .single();

  if (error) {
    throw error;
  }

  return analysisRunRowSchema.parse(data);
};

export const createAnalysisFindings = async (
  analysisRunId: string,
  findings: {
    findingType: AnalysisFindingType;
    ingredientId: string | null;
    ingredientName: string;
    evidenceLevel: AnalysisConfidenceLevel;
    reason: string;
    supportingLogs: string[];
  }[]
): Promise<AnalysisFindingRow[]> => {
  if (findings.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("analysis_findings")
    .insert(
      findings.map((finding) => ({
        analysis_run_id: analysisRunId,
        finding_type: finding.findingType,
        ingredient_id: finding.ingredientId,
        ingredient_name: finding.ingredientName,
        evidence_level: finding.evidenceLevel,
        reason: finding.reason,
        supporting_logs: finding.supportingLogs
      }))
    )
    .select(analysisFindingSelect);

  if (error) {
    throw error;
  }

  return z.array(analysisFindingRowSchema).parse(data);
};

export const findLatestAnalysisRun = async (userId: string): Promise<AnalysisRunRow | null> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("analysis_runs")
    .select(analysisRunSelect)
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? analysisRunRowSchema.parse(data) : null;
};

export const findAnalysisRunById = async (
  userId: string,
  analysisRunId: string
): Promise<AnalysisRunRow | null> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("analysis_runs")
    .select(analysisRunSelect)
    .eq("user_id", userId)
    .eq("id", analysisRunId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? analysisRunRowSchema.parse(data) : null;
};

export const listAnalysisFindings = async (
  analysisRunId: string
): Promise<AnalysisFindingRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("analysis_findings")
    .select(analysisFindingSelect)
    .eq("analysis_run_id", analysisRunId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(analysisFindingRowSchema).parse(data);
};
