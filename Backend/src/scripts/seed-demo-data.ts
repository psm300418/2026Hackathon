import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import { runAnalysis } from "../services/analysis.service.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, "../..");
const productSeedPath = path.join(backendRoot, "supabase", "seed", "product_seed.products.json");

const DEFAULT_DEMO_EMAIL = "demo@example.com";
const DEFAULT_DEMO_PASSWORD = "demo1234";
const DEMO_SEED_BATCH = "demo_hackathon_20260818";

const productSeedSchema = z.array(
  z.object({
    externalId: z.string().min(1),
    source: z.literal("seed"),
    name: z.string().min(1),
    normalizedName: z.string().min(1),
    brand: z.string().min(1),
    category: z.string().min(1),
    ingredientsText: z.string().min(1),
    verificationStatus: z.literal("verified"),
    sourceUrl: z.string().url(),
    sourceCheckedAt: z.string().min(1),
    region: z.literal("KR"),
    formulaVersion: z.string().min(1),
    seedBatch: z.string().min(1)
  })
);

const productIdRowSchema = z.object({
  id: z.string().uuid(),
  external_id: z.string()
});

const userIdRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional()
});

const idRowSchema = z.object({
  id: z.string().uuid()
});

type ProductSource = "seed" | "admin";
type ProductItemType = "cosmetic" | "shower_product" | "supplement";
type VerificationStatus = "verified" | "needs_review";

type DemoProduct = {
  externalId: string;
  source: ProductSource;
  itemType: ProductItemType;
  name: string;
  normalizedName: string;
  brand: string;
  category: string;
  ingredientsText: string;
  verificationStatus: VerificationStatus;
  sourceUrl: string;
  sourceCheckedAt: string;
  region: "KR" | "US" | "IE";
  formulaVersion: string;
  seedBatch: string;
};

type ProductInsertRow = {
  external_id: string;
  source: ProductSource;
  item_type: ProductItemType;
  name: string;
  normalized_name: string;
  brand: string;
  category: string;
  ingredients_text: string;
  verification_status: VerificationStatus;
  source_url: string;
  source_checked_at: string;
  region: DemoProduct["region"];
  formula_version: string;
  seed_batch: string;
};

type UserProductSeed = {
  productExternalId: string;
  usageStatus: "current" | "past" | "paused";
  isPastExperience: boolean;
  pastReactionMemo: string | null;
  memo: string | null;
};

type DemoRoutineSeed = {
  name: string;
  productExternalIds: string[];
};

type DailyRecordSeed = {
  recordDate: string;
  dryness: number;
  oiliness: number;
  redness: number;
  trouble: number;
  sleepHours: number;
  outdoorMinutes: number;
  memo: string;
  productExternalIds: string[];
  routineNames: string[];
  environment: {
    temperatureCelsius: number;
    humidityPercent: number;
    precipitationAmountMm: number;
    windSpeedMps: number;
  };
};

const selectedSeedExternalIds = [
  "seed_97_ko_official-001",
  "seed_97_ko_official-015",
  "seed_97_ko_official-005",
  "seed_additional_100_ko_official-009"
] as const;

const externalProducts: DemoProduct[] = [
  {
    externalId: "demo_admin-shower-drforhair-folligen-shampoo",
    source: "admin",
    itemType: "shower_product",
    name: "폴리젠 플러스 탈모 완화 샴푸",
    normalizedName: "폴리젠 플러스 탈모 완화 샴푸",
    brand: "닥터포헤어",
    category: "샴푸",
    ingredientsText:
      "징크피리치온 0.288%, 살리실릭애씨드 0.2%, 정제수, 다이소듐라우레스설포석시네이트, 라우릴하이드록시설테인, 코카마이드메틸엠이에이, 글리세린, 소듐코코일아이세티오네이트, 판테놀, 향료, 나이아신아마이드, 바이오틴, 세라마이드엔피, 멘톨, 소듐벤조에이트, 시트릭애씨드, 토코페롤, 1,2-헥산다이올",
    verificationStatus: "verified",
    sourceUrl:
      "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?audience=consumer&setid=f2dcca44-72a4-4e90-92e9-08c3d95e4893",
    sourceCheckedAt: "2026-08-19",
    region: "US",
    formulaVersion: "DailyMed label updated:2019-08-07",
    seedBatch: DEMO_SEED_BATCH
  },
  {
    externalId: "demo_admin-supplement-centrum-multigummies",
    source: "admin",
    itemType: "supplement",
    name: "센트룸 멀티구미",
    normalizedName: "센트룸 멀티구미",
    brand: "센트룸",
    category: "영양제",
    ingredientsText:
      "비타민A, 비타민D, 비타민E, 비타민B6, 비타민B12, 아연, 나이아신, 비오틴, 요오드",
    verificationStatus: "verified",
    sourceUrl: "https://www.haleon.com/kr/news/press-releases/brand/2021/2021-04-01",
    sourceCheckedAt: "2026-08-19",
    region: "KR",
    formulaVersion: "Haleon Korea press release:2021-04-01",
    seedBatch: DEMO_SEED_BATCH
  }
];

const userProductSeeds: UserProductSeed[] = [
  {
    productExternalId: "seed_97_ko_official-001",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "자극 없이 산뜻했고 세안 후 당김이 줄어든 느낌.",
    memo: "아침과 저녁에 모두 사용"
  },
  {
    productExternalId: "seed_97_ko_official-015",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "붉음이 있는 날에도 비교적 편안하게 사용.",
    memo: "저녁 보습용"
  },
  {
    productExternalId: "seed_97_ko_official-005",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "건조함이 심한 날 보조로 사용하면 다음날 당김이 덜함.",
    memo: "주 4-5회 사용"
  },
  {
    productExternalId: "seed_additional_100_ko_official-009",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "외출 많은 날 사용. 트러블 변화는 아직 불확실.",
    memo: "아침 외출 전 사용"
  },
  {
    productExternalId: "demo_admin-shower-drforhair-folligen-shampoo",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "두피가 기름진 날 사용하면 개운하지만, 민감한 날은 약간 당김.",
    memo: "격일 사용"
  },
  {
    productExternalId: "demo_admin-supplement-centrum-multigummies",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "피부 변화와 직접 연결은 불확실하지만 생활 기록 참고용.",
    memo: "아침 식후 섭취"
  }
];

const routineSeeds: DemoRoutineSeed[] = [
  {
    name: "아침 기본 루틴",
    productExternalIds: [
      "seed_97_ko_official-001",
      "seed_97_ko_official-015",
      "seed_additional_100_ko_official-009"
    ]
  },
  {
    name: "저녁 회복 루틴",
    productExternalIds: [
      "seed_97_ko_official-001",
      "seed_97_ko_official-005",
      "seed_97_ko_official-015"
    ]
  },
  {
    name: "두피/영양 관리",
    productExternalIds: [
      "demo_admin-shower-drforhair-folligen-shampoo",
      "demo_admin-supplement-centrum-multigummies"
    ]
  }
];

const toProductRow = (product: DemoProduct): ProductInsertRow => ({
  external_id: product.externalId,
  source: product.source,
  item_type: product.itemType,
  name: product.name,
  normalized_name: product.normalizedName,
  brand: product.brand,
  category: product.category,
  ingredients_text: product.ingredientsText,
  verification_status: product.verificationStatus,
  source_url: product.sourceUrl,
  source_checked_at: product.sourceCheckedAt,
  region: product.region,
  formula_version: product.formulaVersion,
  seed_batch: product.seedBatch
});

const splitIngredients = (ingredientsText: string) =>
  ingredientsText
    .split(/[,，\n]+/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const todayInSeoul = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

const getDemoUserCredentials = () => ({
  email: process.env.DEMO_USER_EMAIL ?? DEFAULT_DEMO_EMAIL,
  password: process.env.DEMO_USER_PASSWORD ?? DEFAULT_DEMO_PASSWORD
});

const findUserByEmail = async (email: string) => {
  const supabase = createSupabaseAdminClient();
  const targetEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === targetEmail);

    if (user) {
      return userIdRowSchema.parse(user);
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }
};

const ensureDemoUser = async () => {
  const { email, password } = getDemoUserCredentials();
  const supabase = createSupabaseAdminClient();
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      user_metadata: {
        accountType: "demo"
      }
    });

    if (error) {
      throw error;
    }

    return { id: existingUser.id, email, password };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      accountType: "demo"
    }
  });

  if (error) {
    throw error;
  }

  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Demo user was created without an id.");
  }

  return { id: userId, email, password };
};

const loadSelectedSkincareProducts = async (): Promise<DemoProduct[]> => {
  const rawContent = await readFile(productSeedPath, "utf8");
  const products = productSeedSchema.parse(JSON.parse(rawContent) as unknown);
  const byExternalId = new Map(products.map((product) => [product.externalId, product] as const));

  return selectedSeedExternalIds.map((externalId) => {
    const product = byExternalId.get(externalId);

    if (!product) {
      throw new Error(`Required seed product not found: ${externalId}`);
    }

    return {
      externalId: product.externalId,
      source: product.source,
      itemType: "cosmetic",
      name: product.name,
      normalizedName: product.normalizedName,
      brand: product.brand,
      category: product.category,
      ingredientsText: product.ingredientsText,
      verificationStatus: product.verificationStatus,
      sourceUrl: product.sourceUrl,
      sourceCheckedAt: product.sourceCheckedAt,
      region: product.region,
      formulaVersion: product.formulaVersion,
      seedBatch: product.seedBatch
    };
  });
};

const requireNoError = (error: unknown, message: string) => {
  if (error) {
    throw new Error(`${message}: ${JSON.stringify(error)}`);
  }
};

const upsertProducts = async (products: DemoProduct[]) => {
  const supabase = createSupabaseAdminClient();
  const rows = products.map(toProductRow);

  const { error: upsertError } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "external_id" });

  requireNoError(upsertError, "Failed to upsert demo products");

  const { data, error: selectError } = await supabase
    .from("products")
    .select("id, external_id")
    .in("external_id", products.map((product) => product.externalId));

  requireNoError(selectError, "Failed to fetch demo products");

  const productIdByExternalId = new Map(
    z.array(productIdRowSchema).parse(data).map((row) => [row.external_id, row.id] as const)
  );

  const productIds = [...productIdByExternalId.values()];
  const { error: deleteIngredientsError } = await supabase
    .from("product_ingredients")
    .delete()
    .in("product_id", productIds);

  requireNoError(deleteIngredientsError, "Failed to replace demo product ingredients");

  const ingredientRows = products.flatMap((product) => {
    const productId = productIdByExternalId.get(product.externalId);

    if (!productId) {
      throw new Error(`Product id not found for ${product.externalId}`);
    }

    return splitIngredients(product.ingredientsText).map((rawName, index) => ({
      product_id: productId,
      ingredient_id: null,
      raw_name: rawName,
      display_order: index + 1,
      amount_text: null,
      amount_status: "unknown",
      match_status: "unmatched"
    }));
  });

  const { error: insertIngredientsError } = await supabase
    .from("product_ingredients")
    .insert(ingredientRows);

  requireNoError(insertIngredientsError, "Failed to insert demo product ingredients");

  return productIdByExternalId;
};

const clearDemoUserData = async (userId: string) => {
  const supabase = createSupabaseAdminClient();

  const tables = [
    "analysis_runs",
    "daily_records",
    "routines",
    "user_products",
    "user_locations"
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);

    requireNoError(error, `Failed to clear demo table: ${table}`);
  }
};

const upsertUserProducts = async (userId: string, productIdByExternalId: Map<string, string>) => {
  const supabase = createSupabaseAdminClient();
  const rows = userProductSeeds.map((seed) => {
    const productId = productIdByExternalId.get(seed.productExternalId);

    if (!productId) {
      throw new Error(`Product id not found for user product: ${seed.productExternalId}`);
    }

    return {
      user_id: userId,
      product_id: productId,
      usage_status: seed.usageStatus,
      started_at: "2026-07-01",
      is_past_experience: seed.isPastExperience,
      past_reaction_memo: seed.pastReactionMemo,
      memo: seed.memo
    };
  });

  const { error: upsertError } = await supabase
    .from("user_products")
    .upsert(rows, { onConflict: "user_id,product_id" });

  requireNoError(upsertError, "Failed to upsert demo user products");

  const { data, error: selectError } = await supabase
    .from("user_products")
    .select("id, product_id")
    .eq("user_id", userId);

  requireNoError(selectError, "Failed to fetch demo user products");

  const productIdToExternalId = new Map(
    [...productIdByExternalId.entries()].map(([externalId, productId]) => [productId, externalId] as const)
  );
  const rowsWithIds = z.array(z.object({ id: z.string().uuid(), product_id: z.string().uuid() })).parse(data);

  return new Map(
    rowsWithIds
      .map((row) => {
        const externalId = productIdToExternalId.get(row.product_id);
        return externalId ? ([externalId, row.id] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );
};

const upsertRoutines = async (userId: string, userProductIdByExternalId: Map<string, string>) => {
  const supabase = createSupabaseAdminClient();
  const routineIdByName = new Map<string, string>();

  for (const routine of routineSeeds) {
    const { data, error } = await supabase
      .from("routines")
      .upsert({ user_id: userId, name: routine.name }, { onConflict: "user_id,name" })
      .select("id")
      .single();

    requireNoError(error, `Failed to upsert routine: ${routine.name}`);

    const routineId = idRowSchema.parse(data).id;
    routineIdByName.set(routine.name, routineId);

    const { error: deleteError } = await supabase
      .from("routine_products")
      .delete()
      .eq("routine_id", routineId);

    requireNoError(deleteError, `Failed to replace routine products: ${routine.name}`);

    const rows = routine.productExternalIds.map((externalId, index) => {
      const userProductId = userProductIdByExternalId.get(externalId);

      if (!userProductId) {
        throw new Error(`User product id not found for routine item: ${externalId}`);
      }

      return {
        routine_id: routineId,
        user_product_id: userProductId,
        display_order: index + 1
      };
    });

    const { error: insertError } = await supabase.from("routine_products").insert(rows);

    requireNoError(insertError, `Failed to insert routine products: ${routine.name}`);
  }

  return routineIdByName;
};

const clampScore = (value: number) => Math.max(0, Math.min(5, Math.round(value)));

const buildDailyRecords = (today: string): DailyRecordSeed[] => {
  const endDate = new Date(`${today}T00:00:00.000Z`);
  const startDate = addDays(endDate, -29);
  const records: DailyRecordSeed[] = [];
  const memoPool = [
    "세안 후 당김이 조금 있었지만 저녁 루틴 후 편안함.",
    "외출 시간이 길어 선크림을 꼼꼼히 사용함.",
    "수면이 부족해서 아침 붉음이 약간 올라옴.",
    "트러블 부위는 작게 남아 있고 전체 컨디션은 보통.",
    "보습 제품을 충분히 발라 건조함이 덜함.",
    "두피 샴푸 사용일. 얼굴 피부 변화는 크지 않음."
  ];

  for (let index = 0; index < 30; index += 1) {
    const date = toDateString(addDays(startDate, index));
    const weekend = index % 7 === 5 || index % 7 === 6;
    const poorSleep = index % 9 === 2 || index % 11 === 5;
    const longOutdoor = weekend || index % 8 === 3;
    const shampooDay = index % 2 === 0;
    const supplementDay = index % 5 !== 1;
    const serumDay = index >= 6 && index % 6 !== 1;
    const trendImprovement = Math.min(index / 18, 1);
    const poorSleepPenalty = poorSleep ? 1 : 0;
    const outdoorPenalty = longOutdoor ? 1 : 0;
    const serumBenefit = serumDay ? 0.6 : 0;

    const dryness = clampScore(4 - trendImprovement * 1.8 + poorSleepPenalty * 0.4 - serumBenefit);
    const oiliness = clampScore(2 + (weekend ? 0 : 0.3) + (index % 10 === 4 ? 1 : 0));
    const redness = clampScore(2 + poorSleepPenalty + outdoorPenalty * 0.4 - trendImprovement * 0.9);
    const trouble = clampScore(2 + (poorSleep ? 1 : 0) + (index % 13 === 4 ? 1 : 0) - trendImprovement * 0.8);
    const sleepHours = poorSleep ? 5.4 : Number((6.7 + (index % 5) * 0.25 + (weekend ? 0.6 : 0)).toFixed(1));
    const outdoorMinutes = longOutdoor ? 130 + (index % 4) * 20 : 25 + (index % 5) * 10;
    const productExternalIds = [
      "seed_97_ko_official-001",
      "seed_97_ko_official-015",
      "seed_additional_100_ko_official-009",
      ...(serumDay ? ["seed_97_ko_official-005"] : []),
      ...(shampooDay ? ["demo_admin-shower-drforhair-folligen-shampoo"] : []),
      ...(supplementDay ? ["demo_admin-supplement-centrum-multigummies"] : [])
    ];
    const routineNames = [
      "아침 기본 루틴",
      ...(serumDay ? ["저녁 회복 루틴"] : []),
      ...(shampooDay || supplementDay ? ["두피/영양 관리"] : [])
    ];

    records.push({
      recordDate: date,
      dryness,
      oiliness,
      redness,
      trouble,
      sleepHours,
      outdoorMinutes,
      memo: memoPool[index % memoPool.length],
      productExternalIds,
      routineNames,
      environment: {
        temperatureCelsius: Number((27.2 + (index % 9) * 0.45 + (longOutdoor ? 0.8 : 0)).toFixed(1)),
        humidityPercent: 57 + (index % 8) * 4 + (index % 6 === 0 ? 9 : 0),
        precipitationAmountMm: index % 12 === 5 ? 4.5 : 0,
        windSpeedMps: Number((1.1 + (index % 6) * 0.25).toFixed(1))
      }
    });
  }

  return records;
};

const upsertLocation = async (userId: string) => {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("user_locations")
    .upsert(
      {
        user_id: userId,
        region_label: "서울특별시 강남구",
        weather_station_id: 108,
        weather_station_name: "서울"
      },
      { onConflict: "user_id" }
    );

  requireNoError(error, "Failed to upsert demo location");
};

const upsertDailyRecords = async (
  userId: string,
  userProductIdByExternalId: Map<string, string>,
  routineIdByName: Map<string, string>
) => {
  const supabase = createSupabaseAdminClient();
  const records = buildDailyRecords(todayInSeoul());

  for (const record of records) {
    const loggedAt = `${record.recordDate}T21:30:00+09:00`;
    const { data, error } = await supabase
      .from("daily_records")
      .upsert(
        {
          user_id: userId,
          record_date: record.recordDate,
          logged_at: loggedAt,
          dryness: record.dryness,
          oiliness: record.oiliness,
          redness: record.redness,
          trouble: record.trouble,
          sleep_hours: record.sleepHours,
          outdoor_minutes: record.outdoorMinutes,
          memo: record.memo
        },
        { onConflict: "user_id,record_date" }
      )
      .select("id")
      .single();

    requireNoError(error, `Failed to upsert daily record: ${record.recordDate}`);

    const dailyRecordId = idRowSchema.parse(data).id;
    const { error: deleteProductsError } = await supabase
      .from("daily_record_products")
      .delete()
      .eq("daily_record_id", dailyRecordId);

    requireNoError(deleteProductsError, `Failed to replace daily record products: ${record.recordDate}`);

    const productRows = [...new Set(record.productExternalIds)].map((externalId) => {
      const userProductId = userProductIdByExternalId.get(externalId);

      if (!userProductId) {
        throw new Error(`User product id not found for daily record item: ${externalId}`);
      }

      return {
        daily_record_id: dailyRecordId,
        user_product_id: userProductId
      };
    });

    const { error: insertProductsError } = await supabase
      .from("daily_record_products")
      .insert(productRows);

    requireNoError(insertProductsError, `Failed to insert daily record products: ${record.recordDate}`);

    const { error: deletePresetsError } = await supabase
      .from("daily_record_presets")
      .delete()
      .eq("daily_record_id", dailyRecordId);

    requireNoError(deletePresetsError, `Failed to replace daily record presets: ${record.recordDate}`);

    const presetRows = [...new Set(record.routineNames)].map((routineName) => {
      const routineId = routineIdByName.get(routineName);

      if (!routineId) {
        throw new Error(`Routine id not found for daily record preset: ${routineName}`);
      }

      return {
        daily_record_id: dailyRecordId,
        routine_id: routineId
      };
    });

    const { error: insertPresetsError } = await supabase
      .from("daily_record_presets")
      .insert(presetRows);

    requireNoError(insertPresetsError, `Failed to insert daily record presets: ${record.recordDate}`);

    const { error: environmentError } = await supabase
      .from("daily_record_environment")
      .upsert(
        {
          daily_record_id: dailyRecordId,
          source: "demo",
          region_label: "서울특별시 강남구",
          weather_station_id: 108,
          weather_station_name: "서울",
          observed_at: `${record.recordDate}T21:00:00+09:00`,
          temperature_celsius: record.environment.temperatureCelsius,
          humidity_percent: record.environment.humidityPercent,
          precipitation_amount_mm: record.environment.precipitationAmountMm,
          wind_speed_mps: record.environment.windSpeedMps,
          raw_payload: {
            seedBatch: DEMO_SEED_BATCH,
            note: "Hackathon demo environment snapshot"
          }
        },
        { onConflict: "daily_record_id" }
      );

    requireNoError(environmentError, `Failed to upsert daily record environment: ${record.recordDate}`);
  }

  return records.length;
};

const main = async () => {
  const demoUser = await ensureDemoUser();
  await clearDemoUserData(demoUser.id);
  const skincareProducts = await loadSelectedSkincareProducts();
  const products = [...skincareProducts, ...externalProducts];
  const productIdByExternalId = await upsertProducts(products);
  const userProductIdByExternalId = await upsertUserProducts(demoUser.id, productIdByExternalId);
  const routineIdByName = await upsertRoutines(demoUser.id, userProductIdByExternalId);

  await upsertLocation(demoUser.id);
  const recordCount = await upsertDailyRecords(demoUser.id, userProductIdByExternalId, routineIdByName);
  const analysis = await runAnalysis(demoUser.id);

  console.log("Demo data seed complete");
  console.log(`Demo user: ${demoUser.email}`);
  console.log(`Demo password: ${demoUser.password}`);
  console.log(`Products: ${products.length}`);
  console.log(`Presets: ${routineSeeds.length}`);
  console.log(`Daily records: ${recordCount}`);
  console.log(`Analysis run: ${analysis.analysisRunId}`);
};

main().catch((error: unknown) => {
  console.error("Demo data seed failed");
  console.error(error);
  process.exit(1);
});
