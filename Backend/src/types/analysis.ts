export type AnalysisConfidenceLevel = "strong" | "medium" | "weak" | "data_insufficient";
export type AnalysisFindingType = "positive_suspect" | "negative_suspect";

export type AnalysisRunRow = {
  id: string;
  user_id: string;
  requested_at: string;
  confidence_level: AnalysisConfidenceLevel;
  summary: string;
  limitations: string[];
  next_records_to_add: string[];
  created_at: string;
};

export type AnalysisFindingRow = {
  id: string;
  analysis_run_id: string;
  finding_type: AnalysisFindingType;
  ingredient_id: string | null;
  ingredient_name: string;
  evidence_level: AnalysisConfidenceLevel;
  reason: string;
  supporting_logs: string[];
  created_at: string;
};

export type AnalysisFindingDto = {
  id: string;
  name: string;
  evidenceLevel: AnalysisConfidenceLevel;
  reason: string;
  supportingLogs: string[];
};

export type AnalysisResultDto = {
  analysisRunId: string;
  requestedAt: string;
  confidenceLevel: AnalysisConfidenceLevel;
  summary: string;
  positiveSuspectedIngredients: AnalysisFindingDto[];
  negativeSuspectedIngredients: AnalysisFindingDto[];
  limitations: string[];
  nextRecordsToAdd: string[];
};

export type AnalysisIngredientStat = {
  name: string;
  totalExposureCount: number;
  recentExposureCount: number;
  positiveSignalCount: number;
  negativeSignalCount: number;
  lastExposedAt: string;
  productNames: string[];
  itemTypes: string[];
};

export type AnalysisEnvironmentSummary = {
  lowSleepDays: number;
  highOutdoorDays: number;
  highHumidityDays: number;
  lowHumidityDays: number;
  highTemperatureDays: number;
  rainyDays: number;
};

export type AnalysisEvidence = {
  generatedAt: string;
  recentWindowDays: number;
  totalRecordCount: number;
  recentRecordCount: number;
  previousAnalysis: {
    requestedAt: string;
    confidenceLevel: AnalysisConfidenceLevel;
    summary: string;
    positiveIngredientNames: string[];
    negativeIngredientNames: string[];
  } | null;
  ingredientStats: AnalysisIngredientStat[];
  environmentSummary: AnalysisEnvironmentSummary;
  limitations: string[];
};

export type GeneratedAnalysisFinding = {
  name: string;
  evidenceLevel: AnalysisConfidenceLevel;
  reason: string;
  supportingLogs: string[];
};

export type GeneratedAnalysis = {
  confidenceLevel: AnalysisConfidenceLevel;
  summary: string;
  positiveSuspectedIngredients: GeneratedAnalysisFinding[];
  negativeSuspectedIngredients: GeneratedAnalysisFinding[];
  limitations: string[];
  nextRecordsToAdd: string[];
};
