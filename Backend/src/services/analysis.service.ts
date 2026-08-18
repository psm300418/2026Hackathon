import {
  createAnalysisFindings,
  createAnalysisRun,
  findAnalysisRunById,
  findLatestAnalysisRun,
  listAnalysisFindings
} from "../repositories/analysis.repository.js";
import { generateAnalysisWithOpenAi } from "../gateways/openai-analysis.gateway.js";
import { getDailyRecords } from "./records.service.js";
import { ApiError } from "../types/http.js";
import type {
  AnalysisConfidenceLevel,
  AnalysisEnvironmentSummary,
  AnalysisEvidence,
  AnalysisFindingDto,
  AnalysisFindingRow,
  AnalysisIngredientStat,
  AnalysisResultDto,
  AnalysisRunRow,
  GeneratedAnalysis,
  GeneratedAnalysisFinding
} from "../types/analysis.js";
import type { DailyRecordDto } from "../types/records.js";
import type { ProductSearchItemDto } from "../types/products.js";

const ANALYSIS_WINDOW_DAYS = 30;
const ALL_RECORDS_FROM = "1900-01-01";
const MAX_CANDIDATE_INGREDIENTS = 12;
const WATER_NAMES = new Set(["정제수", "water", "aqua"]);

type IngredientAccumulator = {
  name: string;
  totalExposureCount: number;
  recentExposureCount: number;
  positiveSignalCount: number;
  negativeSignalCount: number;
  lastExposedAt: string;
  productNames: Set<string>;
  itemTypes: Set<string>;
};

const todayInSeoul = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");

const totalSkinScore = (record: DailyRecordDto) =>
  record.dryness + record.oiliness + record.redness + record.trouble;

const signalForRecord = (
  previousRecord: DailyRecordDto | undefined,
  record: DailyRecordDto
) => {
  if (!previousRecord) {
    return 0;
  }

  return totalSkinScore(previousRecord) - totalSkinScore(record);
};

const splitIngredientsText = (text: string | null): string[] => {
  if (!text) {
    return [];
  }

  return text
    .split(/[,，\n/]+/u)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
};

const ingredientNamesForProduct = (product: ProductSearchItemDto): string[] => {
  const names = product.ingredients.length > 0
    ? product.ingredients.map((ingredient) => ingredient.name)
    : splitIngredientsText(product.ingredientsText);

  return names.filter((name) => !WATER_NAMES.has(normalizeName(name)));
};

const ensureAccumulator = (
  stats: Map<string, IngredientAccumulator>,
  ingredientName: string
) => {
  const key = normalizeName(ingredientName);
  const existingStat = stats.get(key);

  if (existingStat) {
    return existingStat;
  }

  const stat: IngredientAccumulator = {
    name: ingredientName,
    totalExposureCount: 0,
    recentExposureCount: 0,
    positiveSignalCount: 0,
    negativeSignalCount: 0,
    lastExposedAt: "",
    productNames: new Set<string>(),
    itemTypes: new Set<string>()
  };
  stats.set(key, stat);
  return stat;
};

const buildIngredientStats = (
  records: DailyRecordDto[],
  recentFrom: string
): AnalysisIngredientStat[] => {
  const stats = new Map<string, IngredientAccumulator>();
  const ascendingRecords = [...records].sort((left, right) => left.recordDate.localeCompare(right.recordDate));

  ascendingRecords.forEach((record, index) => {
    const signal = signalForRecord(ascendingRecords[index - 1], record);
    const isRecent = record.recordDate >= recentFrom;
    const uniqueIngredientNames = new Map<string, string>();

    for (const userProduct of record.products) {
      for (const ingredientName of ingredientNamesForProduct(userProduct.product)) {
        uniqueIngredientNames.set(normalizeName(ingredientName), ingredientName);
      }
    }

    for (const ingredientName of uniqueIngredientNames.values()) {
      const stat = ensureAccumulator(stats, ingredientName);
      stat.totalExposureCount += 1;
      stat.recentExposureCount += isRecent ? 1 : 0;
      stat.positiveSignalCount += signal > 0 ? 1 : 0;
      stat.negativeSignalCount += signal < 0 ? 1 : 0;
      stat.lastExposedAt = record.recordDate;

      for (const userProduct of record.products) {
        if (ingredientNamesForProduct(userProduct.product).some((name) => normalizeName(name) === normalizeName(ingredientName))) {
          stat.productNames.add(userProduct.product.name);
          stat.itemTypes.add(userProduct.product.itemType);
        }
      }
    }
  });

  return [...stats.values()]
    .map((stat) => ({
      name: stat.name,
      totalExposureCount: stat.totalExposureCount,
      recentExposureCount: stat.recentExposureCount,
      positiveSignalCount: stat.positiveSignalCount,
      negativeSignalCount: stat.negativeSignalCount,
      lastExposedAt: stat.lastExposedAt,
      productNames: [...stat.productNames].slice(0, 5),
      itemTypes: [...stat.itemTypes]
    }))
    .sort((left, right) => {
      const leftSignal = left.positiveSignalCount + left.negativeSignalCount + left.recentExposureCount;
      const rightSignal = right.positiveSignalCount + right.negativeSignalCount + right.recentExposureCount;
      return rightSignal - leftSignal || right.totalExposureCount - left.totalExposureCount;
    })
    .slice(0, MAX_CANDIDATE_INGREDIENTS);
};

const buildEnvironmentSummary = (records: DailyRecordDto[]): AnalysisEnvironmentSummary =>
  records.reduce<AnalysisEnvironmentSummary>(
    (summary, record) => ({
      lowSleepDays: summary.lowSleepDays + (record.sleepHours < 6 ? 1 : 0),
      highOutdoorDays: summary.highOutdoorDays + ((record.outdoorMinutes ?? 0) >= 120 ? 1 : 0),
      highHumidityDays: summary.highHumidityDays + ((record.environment?.humidityPercent ?? 0) >= 80 ? 1 : 0),
      lowHumidityDays: summary.lowHumidityDays + (
        record.environment?.humidityPercent !== null &&
        record.environment?.humidityPercent !== undefined &&
        record.environment.humidityPercent <= 35 ? 1 : 0
      ),
      highTemperatureDays: summary.highTemperatureDays + ((record.environment?.temperatureCelsius ?? 0) >= 30 ? 1 : 0),
      rainyDays: summary.rainyDays + ((record.environment?.precipitationAmountMm ?? 0) > 0 ? 1 : 0)
    }),
    {
      lowSleepDays: 0,
      highOutdoorDays: 0,
      highHumidityDays: 0,
      lowHumidityDays: 0,
      highTemperatureDays: 0,
      rainyDays: 0
    }
  );

const confidenceForRecordCount = (recentRecordCount: number): AnalysisConfidenceLevel => {
  if (recentRecordCount <= 2) {
    return "data_insufficient";
  }

  if (recentRecordCount <= 6) {
    return "weak";
  }

  return "medium";
};

const baseLimitations = (recentRecordCount: number): string[] => {
  if (recentRecordCount === 0) {
    return ["최근 30일 기록이 없어 분석할 데이터가 없습니다."];
  }

  if (recentRecordCount <= 2) {
    return ["최근 30일 기록 수가 적어 관련 가능성만 낮은 신뢰도로 표시합니다."];
  }

  if (recentRecordCount <= 6) {
    return ["기록 수가 아직 충분하지 않아 성분 후보는 약한 근거로 해석해야 합니다."];
  }

  return [];
};

const toPreviousAnalysisEvidence = (
  previousRun: AnalysisRunRow | null,
  previousFindings: AnalysisFindingRow[]
): AnalysisEvidence["previousAnalysis"] => {
  if (!previousRun) {
    return null;
  }

  return {
    requestedAt: previousRun.requested_at,
    confidenceLevel: previousRun.confidence_level,
    summary: previousRun.summary,
    positiveIngredientNames: previousFindings
      .filter((finding) => finding.finding_type === "positive_suspect")
      .map((finding) => finding.ingredient_name),
    negativeIngredientNames: previousFindings
      .filter((finding) => finding.finding_type === "negative_suspect")
      .map((finding) => finding.ingredient_name)
  };
};

const buildEvidence = async (userId: string): Promise<AnalysisEvidence> => {
  const today = todayInSeoul();
  const recentFrom = toDateString(addDays(new Date(`${today}T00:00:00.000Z`), -(ANALYSIS_WINDOW_DAYS - 1)));
  const records = await getDailyRecords(userId, { from: ALL_RECORDS_FROM, to: today });
  const recentRecords = records.filter((record) => record.recordDate >= recentFrom);
  const previousRun = await findLatestAnalysisRun(userId);
  const previousFindings = previousRun ? await listAnalysisFindings(previousRun.id) : [];

  return {
    generatedAt: new Date().toISOString(),
    recentWindowDays: ANALYSIS_WINDOW_DAYS,
    totalRecordCount: records.length,
    recentRecordCount: recentRecords.length,
    previousAnalysis: toPreviousAnalysisEvidence(previousRun, previousFindings),
    ingredientStats: buildIngredientStats(records, recentFrom),
    environmentSummary: buildEnvironmentSummary(recentRecords),
    limitations: baseLimitations(recentRecords.length)
  };
};

const fallbackFindings = (
  stats: AnalysisIngredientStat[],
  type: "positive" | "negative"
): GeneratedAnalysisFinding[] => {
  const scoreKey = type === "positive" ? "positiveSignalCount" : "negativeSignalCount";

  return stats
    .filter((stat) => stat[scoreKey] > 0)
    .sort((left, right) => right[scoreKey] - left[scoreKey] || right.recentExposureCount - left.recentExposureCount)
    .slice(0, 5)
    .map((stat) => ({
      name: stat.name,
      evidenceLevel: stat[scoreKey] >= 3 ? "weak" : "data_insufficient",
      reason: `${stat.name}은 기록상 ${stat[scoreKey]}회 ${type === "positive" ? "피부 점수 감소" : "피부 점수 증가"}가 있던 날 함께 나타난 의심 성분 후보입니다. 원인으로 확정할 수는 없습니다.`,
      supportingLogs: [
        `전체 노출 ${stat.totalExposureCount}회`,
        `최근 30일 노출 ${stat.recentExposureCount}회`,
        `관련 제품: ${stat.productNames.slice(0, 3).join(", ")}`
      ].filter((value) => !value.endsWith(": "))
    }));
};

const fallbackAnalysis = (evidence: AnalysisEvidence): GeneratedAnalysis => {
  const confidenceLevel = confidenceForRecordCount(evidence.recentRecordCount);

  return {
    confidenceLevel,
    summary: evidence.recentRecordCount === 0
      ? "최근 30일 피부 기록이 없어 분석할 수 있는 데이터가 아직 부족합니다."
      : "AI 설명 생성에 실패해 기록 기반 통계 요약만 표시합니다. 성분 후보는 관련 가능성으로만 참고해주세요.",
    positiveSuspectedIngredients: fallbackFindings(evidence.ingredientStats, "positive"),
    negativeSuspectedIngredients: fallbackFindings(evidence.ingredientStats, "negative"),
    limitations: evidence.limitations,
    nextRecordsToAdd: [
      "같은 제품을 사용한 날과 사용하지 않은 날의 피부 상태",
      "수면 시간과 외출 시간을 꾸준히 기록",
      "제품을 바꾼 날의 메모"
    ]
  };
};

const clampFindings = (findings: GeneratedAnalysisFinding[]) =>
  findings.slice(0, 5).map((finding) => ({
    name: finding.name,
    evidenceLevel: finding.evidenceLevel,
    reason: finding.reason,
    supportingLogs: finding.supportingLogs.slice(0, 5)
  }));

const createAndStoreAnalysis = async (
  userId: string,
  generatedAnalysis: GeneratedAnalysis
): Promise<AnalysisResultDto> => {
  const run = await createAnalysisRun({
    userId,
    confidenceLevel: generatedAnalysis.confidenceLevel,
    summary: generatedAnalysis.summary,
    limitations: generatedAnalysis.limitations,
    nextRecordsToAdd: generatedAnalysis.nextRecordsToAdd
  });
  const positiveFindings = clampFindings(generatedAnalysis.positiveSuspectedIngredients);
  const negativeFindings = clampFindings(generatedAnalysis.negativeSuspectedIngredients);
  const findings = await createAnalysisFindings(run.id, [
    ...positiveFindings.map((finding) => ({
      findingType: "positive_suspect" as const,
      ingredientId: null,
      ingredientName: finding.name,
      evidenceLevel: finding.evidenceLevel,
      reason: finding.reason,
      supportingLogs: finding.supportingLogs
    })),
    ...negativeFindings.map((finding) => ({
      findingType: "negative_suspect" as const,
      ingredientId: null,
      ingredientName: finding.name,
      evidenceLevel: finding.evidenceLevel,
      reason: finding.reason,
      supportingLogs: finding.supportingLogs
    }))
  ]);

  return toAnalysisResultDto(run, findings);
};

const toFindingDto = (finding: AnalysisFindingRow): AnalysisFindingDto => ({
  id: finding.id,
  name: finding.ingredient_name,
  evidenceLevel: finding.evidence_level,
  reason: finding.reason,
  supportingLogs: finding.supporting_logs
});

const toAnalysisResultDto = (
  run: AnalysisRunRow,
  findings: AnalysisFindingRow[]
): AnalysisResultDto => ({
  analysisRunId: run.id,
  requestedAt: run.requested_at,
  confidenceLevel: run.confidence_level,
  summary: run.summary,
  positiveSuspectedIngredients: findings
    .filter((finding) => finding.finding_type === "positive_suspect")
    .map(toFindingDto),
  negativeSuspectedIngredients: findings
    .filter((finding) => finding.finding_type === "negative_suspect")
    .map(toFindingDto),
  limitations: run.limitations,
  nextRecordsToAdd: run.next_records_to_add
});

export const runAnalysis = async (userId: string): Promise<AnalysisResultDto> => {
  const evidence = await buildEvidence(userId);
  const generatedAnalysis = await generateAnalysisWithOpenAi(evidence).catch(() => fallbackAnalysis(evidence));
  const mergedAnalysis = {
    ...generatedAnalysis,
    limitations: [...new Set([...evidence.limitations, ...generatedAnalysis.limitations])]
  };

  return createAndStoreAnalysis(userId, mergedAnalysis);
};

export const getLatestAnalysis = async (userId: string): Promise<AnalysisResultDto | null> => {
  const run = await findLatestAnalysisRun(userId);

  if (!run) {
    return null;
  }

  const findings = await listAnalysisFindings(run.id);
  return toAnalysisResultDto(run, findings);
};

export const getAnalysis = async (
  userId: string,
  analysisRunId: string
): Promise<AnalysisResultDto> => {
  const run = await findAnalysisRunById(userId, analysisRunId);

  if (!run) {
    throw new ApiError(404, "NOT_FOUND", "분석 결과를 찾을 수 없습니다.");
  }

  const findings = await listAnalysisFindings(run.id);
  return toAnalysisResultDto(run, findings);
};
