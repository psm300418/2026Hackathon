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
  AnalysisFactorSummary,
  AnalysisFactorTag,
  AnalysisFindingDto,
  AnalysisFindingRow,
  AnalysisIngredientStat,
  AnalysisNotableEvent,
  AnalysisResultDto,
  AnalysisRunRow,
  AnalysisTrendPoint,
  GeneratedAnalysis,
  GeneratedAnalysisFinding
} from "../types/analysis.js";
import type { DailyRecordDto } from "../types/records.js";
import type { ProductSearchItemDto } from "../types/products.js";

const ANALYSIS_WINDOW_DAYS = 30;
const ALL_RECORDS_FROM = "1900-01-01";
const MAX_CANDIDATE_INGREDIENTS = 12;
const WATER_NAMES = new Set(["정제수", "water", "aqua"]);
const BASELINE_LOOKBACK_DAYS = 7;
const NOTABLE_EVENT_DELTA = 2;

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

const average = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

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

const toTrendPoints = (records: DailyRecordDto[]): AnalysisTrendPoint[] =>
  [...records]
    .sort((left, right) => left.recordDate.localeCompare(right.recordDate))
    .map((record) => ({
      date: record.recordDate,
      totalScore: totalSkinScore(record),
      dryness: record.dryness,
      oiliness: record.oiliness,
      redness: record.redness,
      trouble: record.trouble,
      sleepHours: record.sleepHours,
      outdoorMinutes: record.outdoorMinutes,
      humidityPercent: record.environment?.humidityPercent ?? null,
      temperatureCelsius: record.environment?.temperatureCelsius ?? null
    }));

const factorLabelByTag: Record<AnalysisFactorTag, string> = {
  low_sleep: "수면 부족",
  high_humidity: "높은 습도",
  low_humidity: "낮은 습도",
  high_temperature: "높은 기온",
  long_outdoor: "긴 외출",
  rain: "강수",
  first_product_use: "첫 사용 제품",
  product_change: "제품 변화"
};

const firstUsedDateByUserProductId = (records: DailyRecordDto[]) => {
  const firstDateByProductId = new Map<string, string>();

  for (const record of [...records].sort((left, right) => left.recordDate.localeCompare(right.recordDate))) {
    for (const userProduct of record.products) {
      if (!firstDateByProductId.has(userProduct.id)) {
        firstDateByProductId.set(userProduct.id, record.recordDate);
      }
    }
  }

  return firstDateByProductId;
};

const previousProductIds = (records: DailyRecordDto[], index: number) =>
  new Set(records[index - 1]?.products.map((userProduct) => userProduct.id) ?? []);

const reasonsForRecord = (
  record: DailyRecordDto,
  records: DailyRecordDto[],
  index: number,
  firstDateByProductId: Map<string, string>
) => {
  const factorTags = new Set<AnalysisFactorTag>();
  const reasons: string[] = [];
  const productNames: string[] = [];
  const previousIds = previousProductIds(records, index);
  const firstProducts = record.products.filter(
    (userProduct) => firstDateByProductId.get(userProduct.id) === record.recordDate
  );
  const changedProducts = record.products.filter((userProduct) => !previousIds.has(userProduct.id));

  if (record.sleepHours < 6) {
    factorTags.add("low_sleep");
    reasons.push(`수면 시간이 ${record.sleepHours}시간으로 짧았습니다.`);
  }
  if ((record.environment?.humidityPercent ?? 0) >= 80) {
    factorTags.add("high_humidity");
    reasons.push(`습도가 ${record.environment?.humidityPercent}%로 높았습니다.`);
  }
  if (
    record.environment?.humidityPercent !== null &&
    record.environment?.humidityPercent !== undefined &&
    record.environment.humidityPercent <= 35
  ) {
    factorTags.add("low_humidity");
    reasons.push(`습도가 ${record.environment.humidityPercent}%로 낮았습니다.`);
  }
  if ((record.environment?.temperatureCelsius ?? 0) >= 30) {
    factorTags.add("high_temperature");
    reasons.push(`기온이 ${record.environment?.temperatureCelsius}도로 높았습니다.`);
  }
  if ((record.outdoorMinutes ?? 0) >= 120) {
    factorTags.add("long_outdoor");
    reasons.push(`외출 시간이 ${record.outdoorMinutes}분으로 길었습니다.`);
  }
  if ((record.environment?.precipitationAmountMm ?? 0) > 0) {
    factorTags.add("rain");
    reasons.push(`강수량 ${record.environment?.precipitationAmountMm}mm가 함께 기록되었습니다.`);
  }
  if (firstProducts.length > 0) {
    factorTags.add("first_product_use");
    const names = firstProducts.map((userProduct) => userProduct.product.name).slice(0, 3);
    productNames.push(...names);
    reasons.push(`처음 사용한 제품: ${names.join(", ")}`);
  } else if (changedProducts.length > 0 && index > 0) {
    factorTags.add("product_change");
    const names = changedProducts.map((userProduct) => userProduct.product.name).slice(0, 3);
    productNames.push(...names);
    reasons.push(`전날과 달라진 제품: ${names.join(", ")}`);
  }

  return {
    factorTags: [...factorTags],
    reasons,
    productNames: [...new Set(productNames)]
  };
};

const buildNotableEvents = (records: DailyRecordDto[]): AnalysisNotableEvent[] => {
  const ascendingRecords = [...records].sort((left, right) => left.recordDate.localeCompare(right.recordDate));
  const firstDateByProductId = firstUsedDateByUserProductId(ascendingRecords);

  return ascendingRecords
    .map((record, index) => {
      const baselineRecords = ascendingRecords.slice(
        Math.max(0, index - BASELINE_LOOKBACK_DAYS),
        index
      );
      const baselineScore = Number(
        average(baselineRecords.map(totalSkinScore)).toFixed(1)
      );
      const totalScore = totalSkinScore(record);
      const scoreDelta = Number((totalScore - baselineScore).toFixed(1));

      if (baselineRecords.length < 3 || scoreDelta < NOTABLE_EVENT_DELTA) {
        return null;
      }

      const context = reasonsForRecord(record, ascendingRecords, index, firstDateByProductId);
      const title = record.trouble >= 4
        ? "트러블이 평소보다 두드러진 날"
        : record.redness >= 4
          ? "붉음이 평소보다 두드러진 날"
          : "피부 점수가 평소보다 오른 날";

      return {
        date: record.recordDate,
        title,
        severity: scoreDelta >= 3 ? "high" as const : "medium" as const,
        totalScore,
        baselineScore,
        scoreDelta,
        factorTags: context.factorTags,
        reasons: context.reasons.length > 0
          ? context.reasons
          : ["피부 점수가 최근 평균보다 올랐지만 함께 기록된 생활/환경 요인은 뚜렷하지 않습니다."],
        productNames: context.productNames
      };
    })
    .filter((event): event is AnalysisNotableEvent => event !== null)
    .sort((left, right) => right.scoreDelta - left.scoreDelta)
    .slice(0, 5);
};

const hasFactor = (
  record: DailyRecordDto,
  records: DailyRecordDto[],
  index: number,
  firstDateByProductId: Map<string, string>,
  factorTag: AnalysisFactorTag
) => {
  if (factorTag === "low_sleep") {
    return record.sleepHours < 6;
  }
  if (factorTag === "high_humidity") {
    return (record.environment?.humidityPercent ?? 0) >= 80;
  }
  if (factorTag === "low_humidity") {
    return record.environment?.humidityPercent !== null &&
      record.environment?.humidityPercent !== undefined &&
      record.environment.humidityPercent <= 35;
  }
  if (factorTag === "high_temperature") {
    return (record.environment?.temperatureCelsius ?? 0) >= 30;
  }
  if (factorTag === "long_outdoor") {
    return (record.outdoorMinutes ?? 0) >= 120;
  }
  if (factorTag === "rain") {
    return (record.environment?.precipitationAmountMm ?? 0) > 0;
  }
  if (factorTag === "first_product_use") {
    return record.products.some(
      (userProduct) => firstDateByProductId.get(userProduct.id) === record.recordDate
    );
  }

  return index > 0 && record.products.some((userProduct) => !previousProductIds(records, index).has(userProduct.id));
};

const buildFactorSummaries = (
  records: DailyRecordDto[],
  notableEvents: AnalysisNotableEvent[]
): AnalysisFactorSummary[] => {
  const ascendingRecords = [...records].sort((left, right) => left.recordDate.localeCompare(right.recordDate));
  const firstDateByProductId = firstUsedDateByUserProductId(ascendingRecords);
  const eventDatesByFactor = new Map<AnalysisFactorTag, Set<string>>();

  for (const event of notableEvents) {
    for (const tag of event.factorTags) {
      const dates = eventDatesByFactor.get(tag) ?? new Set<string>();
      dates.add(event.date);
      eventDatesByFactor.set(tag, dates);
    }
  }

  return (Object.keys(factorLabelByTag) as AnalysisFactorTag[])
    .map((factorTag) => {
      const hitCount = ascendingRecords.filter((record, index) =>
        hasFactor(record, ascendingRecords, index, firstDateByProductId, factorTag)
      ).length;
      const eventCount = eventDatesByFactor.get(factorTag)?.size ?? 0;

      return {
        factorTag,
        label: factorLabelByTag[factorTag],
        hitCount,
        eventCount,
        description: eventCount > 0
          ? `${factorLabelByTag[factorTag]} 조건이 특이 변화일 ${eventCount}회와 함께 나타났습니다.`
          : `${factorLabelByTag[factorTag]} 조건은 ${hitCount}회 기록됐지만 뚜렷한 악화 이벤트와의 반복은 아직 약합니다.`
      };
    })
    .filter((summary) => summary.hitCount > 0)
    .sort((left, right) => right.eventCount - left.eventCount || right.hitCount - left.hitCount)
    .slice(0, 5);
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
  const trendPoints = toTrendPoints(recentRecords);
  const notableEvents = buildNotableEvents(recentRecords);
  const factorSummaries = buildFactorSummaries(recentRecords, notableEvents);

  return {
    generatedAt: new Date().toISOString(),
    recentWindowDays: ANALYSIS_WINDOW_DAYS,
    totalRecordCount: records.length,
    recentRecordCount: recentRecords.length,
    previousAnalysis: toPreviousAnalysisEvidence(previousRun, previousFindings),
    ingredientStats: buildIngredientStats(records, recentFrom),
    environmentSummary: buildEnvironmentSummary(recentRecords),
    trendPoints,
    notableEvents,
    factorSummaries,
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
      : evidence.notableEvents.length > 0
        ? `${evidence.notableEvents[0].date}에 평소 대비 피부 점수가 ${evidence.notableEvents[0].scoreDelta}점 높았습니다. 함께 기록된 후보 요인을 우선 확인해보세요.`
        : "최근 30일 기록에서 큰 급증일은 뚜렷하지 않았고, 성분 후보는 관련 가능성으로만 참고해주세요.",
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
  generatedAnalysis: GeneratedAnalysis,
  evidence: AnalysisEvidence
): Promise<AnalysisResultDto> => {
  const run = await createAnalysisRun({
    userId,
    confidenceLevel: generatedAnalysis.confidenceLevel,
    summary: generatedAnalysis.summary,
    trendPoints: evidence.trendPoints,
    notableEvents: evidence.notableEvents,
    factorSummaries: evidence.factorSummaries,
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
  trendPoints: run.trend_points,
  notableEvents: run.notable_events,
  factorSummaries: run.factor_summaries,
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

  return createAndStoreAnalysis(userId, mergedAnalysis, evidence);
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
