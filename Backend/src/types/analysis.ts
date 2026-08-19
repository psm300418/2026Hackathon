export type AnalysisConfidenceLevel = "strong" | "medium" | "weak" | "data_insufficient";
export type AnalysisFindingType = "positive_suspect" | "negative_suspect";

export type AnalysisRunRow = {
  id: string;
  user_id: string;
  requested_at: string;
  confidence_level: AnalysisConfidenceLevel;
  summary: string;
  trend_points: AnalysisTrendPoint[];
  notable_events: AnalysisNotableEvent[];
  factor_summaries: AnalysisFactorSummary[];
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
  trendPoints: AnalysisTrendPoint[];
  notableEvents: AnalysisNotableEvent[];
  factorSummaries: AnalysisFactorSummary[];
  positiveSuspectedIngredients: AnalysisFindingDto[];
  negativeSuspectedIngredients: AnalysisFindingDto[];
  limitations: string[];
  nextRecordsToAdd: string[];
};

export type AnalysisTrendPoint = {
  date: string;
  totalScore: number;
  dryness: number;
  oiliness: number;
  redness: number;
  trouble: number;
  sleepHours: number;
  outdoorMinutes: number | null;
  humidityPercent: number | null;
  temperatureCelsius: number | null;
};

export type AnalysisFactorTag =
  | "low_sleep"
  | "high_humidity"
  | "low_humidity"
  | "high_temperature"
  | "long_outdoor"
  | "rain"
  | "first_product_use"
  | "product_change";

export type AnalysisNotableEvent = {
  date: string;
  title: string;
  severity: "medium" | "high";
  totalScore: number;
  baselineScore: number;
  scoreDelta: number;
  factorTags: AnalysisFactorTag[];
  reasons: string[];
  productNames: string[];
};

export type AnalysisFactorSummary = {
  factorTag: AnalysisFactorTag;
  label: string;
  hitCount: number;
  eventCount: number;
  description: string;
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
  trendPoints: AnalysisTrendPoint[];
  notableEvents: AnalysisNotableEvent[];
  factorSummaries: AnalysisFactorSummary[];
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
