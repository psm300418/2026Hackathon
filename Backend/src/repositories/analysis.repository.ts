import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type {
  AnalysisConfidenceLevel,
  AnalysisFindingRow,
  AnalysisFindingType,
  AnalysisRunRow
} from "../types/analysis.js";

const confidenceSchema = z.enum(["strong", "medium", "weak", "data_insufficient"]);
const findingTypeSchema = z.enum(["positive_suspect", "negative_suspect"]);

const stringArraySchema = z.preprocess(
  (value) => (Array.isArray(value) ? value.map((item) => String(item)) : []),
  z.array(z.string())
);

const analysisRunRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  requested_at: z.string(),
  confidence_level: confidenceSchema,
  summary: z.string(),
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
