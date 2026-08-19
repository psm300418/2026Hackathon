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
const DEMO_RECORD_DAYS = 90;

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

type PreviousAnalysisSeed = {
  requestedAtDaysAgo: number;
  summary: string;
  positiveIngredientNames: string[];
  negativeIngredientNames: string[];
  notableDateOffset: number;
};

const selectedSeedExternalIds = [
  "seed_97_ko_official-001",
  "seed_97_ko_official-015",
  "seed_97_ko_official-005",
  "seed_additional_100_ko_official-009"
] as const;

const externalProducts: DemoProduct[] = [
  {
    externalId: "demo_admin-cosmetic-glow-night-cream",
    source: "admin",
    itemType: "cosmetic",
    name: "글로우 리치 나이트 크림",
    normalizedName: "글로우 리치 나이트 크림",
    brand: "데모랩",
    category: "크림",
    ingredientsText:
      "정제수, 글리세린, 아이소프로필미리스테이트, 세테아릴알코올, 나이아신아마이드, 시어버터, 다이메티콘, 향료, 리날룰, 리모넨, 토코페롤, 카보머, 트라이에탄올아민",
    verificationStatus: "verified",
    sourceUrl: "https://example.com/demo-glow-night-cream",
    sourceCheckedAt: "2026-08-19",
    region: "KR",
    formulaVersion: "Demo formula for hackathon analysis scenario",
    seedBatch: DEMO_SEED_BATCH
  },
  {
    externalId: "demo_admin-cleanser-cosrx-hydrium-triple-ha",
    source: "admin",
    itemType: "cosmetic",
    name: "하이드리움 트리플 히알루로닉 모이스처라이징 클렌저",
    normalizedName: "하이드리움 트리플 히알루로닉 모이스처라이징 클렌저",
    brand: "COSRX",
    category: "폼클렌징",
    ingredientsText:
      "Water, Glycerin, Stearic Acid, Myristic Acid, Lauric Acid, Potassium Hydroxide, Palmitic Acid, Potassium Cocoyl Glycinate, Coco-Glucoside, Glyceryl Stearate, Fragrance, Polyquaternium-7, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Sodium Cocoyl Isethionate, Arachidic Acid, Disodium EDTA, 1,2-Hexanediol, Oleic Acid, Sodium Benzoate, Quillaja Saponaria Bark Extract, Citric Acid, Butylene Glycol, Panthenol, Hyaluronic Acid, Ethylhexylglycerin, Hydrolyzed Hyaluronic Acid, Sodium Hyaluronate",
    verificationStatus: "verified",
    sourceUrl: "https://www.cosrx.com/products/triple-hyaluronic-moisturizing-cleanser",
    sourceCheckedAt: "2026-08-19",
    region: "US",
    formulaVersion: "COSRX official product page checked:2026-08-19",
    seedBatch: DEMO_SEED_BATCH
  },
  {
    externalId: "demo_admin-cleanser-cosrx-ac-calming-foam",
    source: "admin",
    itemType: "cosmetic",
    name: "AC 컬렉션 카밍 폼 클렌저",
    normalizedName: "AC 컬렉션 카밍 폼 클렌저",
    brand: "COSRX",
    category: "폼클렌징",
    ingredientsText:
      "Water, Glycerin, Stearic Acid, Myristic Acid, PEG-32, Potassium Hydroxide, Palmitic Acid, Lauric Acid, Glyceryl Stearate, PEG-100 Stearate, Lauramide DEA, Cocamidopropyl Betaine, Potassium Cocoate, Salicylic Acid, Sodium Chloride, Arachidic Acid, Lavandula Hybrida Oil, Linalool, Disodium EDTA, Oleic Acid, Limonene, Asiaticoside, Asiatic Acid, Madecassic Acid",
    verificationStatus: "verified",
    sourceUrl: "https://www.cosrx.com/products/ac-collection-calming-foam-cleanser",
    sourceCheckedAt: "2026-08-19",
    region: "US",
    formulaVersion: "COSRX official product page checked:2026-08-19",
    seedBatch: DEMO_SEED_BATCH
  },
  {
    externalId: "demo_admin-cleanser-cosrx-low-ph-good-morning",
    source: "admin",
    itemType: "cosmetic",
    name: "약산성 굿모닝 젤 클렌저",
    normalizedName: "약산성 굿모닝 젤 클렌저",
    brand: "COSRX",
    category: "젤클렌저",
    ingredientsText:
      "Water, Cocamidopropyl Betaine, Sodium Lauroyl Methyl Isethionate, Sodium Chloride, Polysorbate 20, Styrax Japonicus Branch/Fruit/Leaf Extract, Butylene Glycol, Saccharomyces Ferment, Cryptomeria Japonica Leaf Extract, Nelumbo Nucifera Leaf Extract, Pinus Palustris Leaf Extract, Ulmus Davidiana Root Extract, Oenothera Biennis Flower Extract, Pueraria Lobata Root Extract, Melaleuca Alternifolia Tea Tree Leaf Oil, Allantoin, Caprylyl Glycol, Ethylhexylglycerin, Betaine Salicylate, Citric Acid, Ethyl Hexanediol, 1,2-Hexanediol, Trisodium Ethylenediamine Disuccinate, Sodium Benzoate, Disodium EDTA",
    verificationStatus: "verified",
    sourceUrl: "https://www.cosrx.com/products/low-ph-good-morning-gel-cleanser",
    sourceCheckedAt: "2026-08-19",
    region: "US",
    formulaVersion: "COSRX official product page checked:2026-08-19",
    seedBatch: DEMO_SEED_BATCH
  },
  {
    externalId: "demo_admin-cleanser-cosrx-red-rice-inositol",
    source: "admin",
    itemType: "cosmetic",
    name: "레드 라이스 이노시톨 포어 클라리파잉 딥 클렌저",
    normalizedName: "레드 라이스 이노시톨 포어 클라리파잉 딥 클렌저",
    brand: "COSRX",
    category: "폼클렌징",
    ingredientsText:
      "Aqua, Glycerin, Sodium Cocoyl Glycinate, Cellulose, Sodium Lauroyl Glutamate, Hydrated Silica, Kaolin, Disodium Cocoamphodiacetate, 1,2-Hexanediol, Oryza Sativa Rice Seed Water, Betaine, Sodium Chloride, Sodium Sweetalmondamphoacetate, Lauryl Betaine, Sodium Methyl Cocoyl Taurate, Glycol Distearate, Sodium Polyacrylate, Glycol Stearate, Ethylhexylglycerin, Hydroxyacetophenone, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Citric Acid, Inositol, Polyglycerin-3, Phytosteryl/Octyldodecyl Lauroyl Glutamate, Gardenia Florida Fruit Extract, Dextrin, Cyanocobalamin, Hexylene Glycol, Butylene Glycol, Panthenol, Oryza Sativa Rice Seed Extract, Niacinamide, Gluconolactone, Phytic Acid, Beta-Glucan, Sodium Hyaluronate, Tocopherol, Ceramide NP, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate",
    verificationStatus: "verified",
    sourceUrl: "https://www.cosrx.com/products/cosrx-red-rice-inositol-pore-clarifying-deep-cleanser",
    sourceCheckedAt: "2026-08-19",
    region: "US",
    formulaVersion: "COSRX official product page checked:2026-08-19",
    seedBatch: DEMO_SEED_BATCH
  },
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
    productExternalId: "demo_admin-cosmetic-glow-night-cream",
    usageStatus: "current",
    isPastExperience: false,
    pastReactionMemo: null,
    memo: "최근 테스트를 시작한 리치 크림. 향료 포함 여부를 분석 포인트로 확인"
  },
  {
    productExternalId: "demo_admin-cleanser-cosrx-hydrium-triple-ha",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "당김이 적고 세안 후 건조함이 덜한 편.",
    memo: "1주차 데모 클렌저"
  },
  {
    productExternalId: "demo_admin-cleanser-cosrx-ac-calming-foam",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "트러블이 올라온 주간에 세안 후 개운함이 강함.",
    memo: "2주차 데모 클렌저"
  },
  {
    productExternalId: "demo_admin-cleanser-cosrx-low-ph-good-morning",
    usageStatus: "current",
    isPastExperience: true,
    pastReactionMemo: "약산성 젤 타입이라 평소 아침 세안에 무난함.",
    memo: "3주차 데모 클렌저"
  },
  {
    productExternalId: "demo_admin-cleanser-cosrx-red-rice-inositol",
    usageStatus: "current",
    isPastExperience: false,
    pastReactionMemo: null,
    memo: "4주차 데모 클렌저. 포어/딥클렌징 계열"
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
    name: "1주차 수분 클렌징",
    productExternalIds: ["demo_admin-cleanser-cosrx-hydrium-triple-ha"]
  },
  {
    name: "2주차 BHA 클렌징",
    productExternalIds: ["demo_admin-cleanser-cosrx-ac-calming-foam"]
  },
  {
    name: "3주차 약산성 클렌징",
    productExternalIds: ["demo_admin-cleanser-cosrx-low-ph-good-morning"]
  },
  {
    name: "4주차 포어 클렌징",
    productExternalIds: ["demo_admin-cleanser-cosrx-red-rice-inositol"]
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

const cleanserScheduleForIndex = (index: number) => {
  const weekInCycle = Math.floor(index / 7) % 4;
  const schedules = [
    {
      productExternalId: "demo_admin-cleanser-cosrx-hydrium-triple-ha",
      routineName: "1주차 수분 클렌징"
    },
    {
      productExternalId: "demo_admin-cleanser-cosrx-ac-calming-foam",
      routineName: "2주차 BHA 클렌징"
    },
    {
      productExternalId: "demo_admin-cleanser-cosrx-low-ph-good-morning",
      routineName: "3주차 약산성 클렌징"
    },
    {
      productExternalId: "demo_admin-cleanser-cosrx-red-rice-inositol",
      routineName: "4주차 포어 클렌징"
    }
  ] as const;

  return schedules[weekInCycle];
};

const buildDailyRecords = (today: string): DailyRecordSeed[] => {
  const endDate = new Date(`${today}T00:00:00.000Z`);
  const startDate = addDays(endDate, -(DEMO_RECORD_DAYS - 1));
  const records: DailyRecordSeed[] = [];
  const memoPool = [
    "세안 후 당김이 조금 있었지만 저녁 루틴 후 편안함.",
    "외출 시간이 길어 선크림을 꼼꼼히 사용함.",
    "수면이 부족해서 아침 붉음이 약간 올라옴.",
    "트러블 부위는 작게 남아 있고 전체 컨디션은 보통.",
    "보습 제품을 충분히 발라 건조함이 덜함.",
    "두피 샴푸 사용일. 얼굴 피부 변화는 크지 않음."
  ];

  for (let index = 0; index < DEMO_RECORD_DAYS; index += 1) {
    const date = toDateString(addDays(startDate, index));
    const cleanser = cleanserScheduleForIndex(index);
    const cycleIndex = index % 30;
    const weekend = index % 7 === 5 || index % 7 === 6;
    const eventNightCream = cycleIndex >= 14 && cycleIndex <= 17;
    const poorSleep = cycleIndex % 9 === 2 || cycleIndex % 11 === 5 || cycleIndex === 14 || cycleIndex === 22;
    const longOutdoor = weekend || cycleIndex % 8 === 3;
    const shampooDay = index % 2 === 0;
    const supplementDay = index % 5 !== 1;
    const serumDay = index >= 6 && cycleIndex % 6 !== 1;
    const trendImprovement = Math.min(cycleIndex / 18, 1);
    const poorSleepPenalty = poorSleep ? 1 : 0;
    const outdoorPenalty = longOutdoor ? 1 : 0;
    const serumBenefit = serumDay ? 0.6 : 0;

    let dryness = clampScore(4 - trendImprovement * 1.8 + poorSleepPenalty * 0.4 - serumBenefit);
    let oiliness = clampScore(2 + (weekend ? 0 : 0.3) + (cycleIndex % 10 === 4 ? 1 : 0));
    let redness = clampScore(2 + poorSleepPenalty + outdoorPenalty * 0.4 - trendImprovement * 0.9);
    let trouble = clampScore(2 + (poorSleep ? 1 : 0) + (cycleIndex % 13 === 4 ? 1 : 0) - trendImprovement * 0.8);
    let sleepHours = poorSleep ? 5.4 : Number((6.7 + (cycleIndex % 5) * 0.25 + (weekend ? 0.6 : 0)).toFixed(1));
    let outdoorMinutes = longOutdoor ? 130 + (cycleIndex % 4) * 20 : 25 + (cycleIndex % 5) * 10;
    let memo = memoPool[index % memoPool.length];
    let temperatureCelsius = Number((27.2 + (cycleIndex % 9) * 0.45 + (longOutdoor ? 0.8 : 0)).toFixed(1));
    let humidityPercent = 57 + (cycleIndex % 8) * 4 + (cycleIndex % 6 === 0 ? 9 : 0);
    let precipitationAmountMm = cycleIndex % 12 === 5 ? 4.5 : 0;

    if (cycleIndex >= 7 && cycleIndex <= 13) {
      trouble = clampScore(trouble - 1);
      redness = clampScore(redness - 0.5);
      memo = "BHA 폼클렌징 주간. 트러블과 붉음이 조금씩 잦아드는 흐름.";
    }

    if (cycleIndex === 7) {
      dryness = 3;
      oiliness = 3;
      redness = 3;
      trouble = 4;
      memo = "AC 카밍 폼클렌저로 바꾼 첫날. 기존 트러블이 아직 남아 있음.";
    } else if (cycleIndex === 8) {
      dryness = 3;
      oiliness = 2;
      redness = 3;
      trouble = 3;
      memo = "BHA 클렌징 둘째 날. 트러블 붉음이 조금 내려감.";
    } else if (cycleIndex === 9) {
      dryness = 2;
      oiliness = 2;
      redness = 2;
      trouble = 2;
      memo = "BHA 클렌징 주간 중반. 트러블과 유분이 같이 낮아짐.";
    } else if (cycleIndex === 10) {
      dryness = 2;
      oiliness = 2;
      redness = 1;
      trouble = 2;
      memo = "AC 카밍 폼클렌저 사용 후 붉음이 안정적인 날.";
    } else if (cycleIndex === 11 || cycleIndex === 12 || cycleIndex === 13) {
      dryness = 2;
      oiliness = 2;
      redness = 1;
      trouble = 1;
      memo = "BHA 클렌징 주간 후반. 트러블 점수가 낮게 유지됨.";
    }

    if (cycleIndex >= 21 && cycleIndex <= 29) {
      dryness = clampScore(dryness + 0.7);
      memo = "포어 딥클렌징 주간. 세안 후 당김을 더 의식해서 기록함.";
    }

    if (cycleIndex === 14) {
      dryness = 3;
      oiliness = 4;
      redness = 4;
      trouble = 5;
      sleepHours = 5.1;
      outdoorMinutes = 155;
      temperatureCelsius = 31.4;
      humidityPercent = 86;
      precipitationAmountMm = 0;
      memo = "늦게 자고 외출이 길었던 날. 글로우 리치 나이트 크림을 처음 사용함.";
    } else if (cycleIndex === 15) {
      dryness = 3;
      oiliness = 4;
      redness = 4;
      trouble = 4;
      sleepHours = 5.6;
      outdoorMinutes = 60;
      temperatureCelsius = 30.8;
      humidityPercent = 88;
      precipitationAmountMm = 5.2;
      memo = "습도가 높고 비가 온 날. 전날 생긴 트러블이 이어짐.";
    } else if (cycleIndex === 22) {
      dryness = 2;
      oiliness = 3;
      redness = 5;
      trouble = 3;
      sleepHours = 5.0;
      outdoorMinutes = 145;
      temperatureCelsius = 32.1;
      humidityPercent = 82;
      precipitationAmountMm = 0;
      memo = "수면 부족과 긴 외출 후 붉음이 크게 올라옴.";
    } else if (cycleIndex === 25) {
      dryness = 5;
      oiliness = 2;
      redness = 3;
      trouble = 2;
      sleepHours = 7.2;
      outdoorMinutes = 35;
      temperatureCelsius = 28.0;
      humidityPercent = 34;
      precipitationAmountMm = 0;
      memo = "습도가 낮아 세안 후 당김과 건조함이 강하게 느껴짐.";
    }

    const productExternalIds = [
      "seed_97_ko_official-001",
      "seed_97_ko_official-015",
      "seed_additional_100_ko_official-009",
      cleanser.productExternalId,
      ...(serumDay ? ["seed_97_ko_official-005"] : []),
      ...(eventNightCream ? ["demo_admin-cosmetic-glow-night-cream"] : []),
      ...(shampooDay ? ["demo_admin-shower-drforhair-folligen-shampoo"] : []),
      ...(supplementDay ? ["demo_admin-supplement-centrum-multigummies"] : [])
    ];
    const routineNames = [
      "아침 기본 루틴",
      cleanser.routineName,
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
      memo,
      productExternalIds,
      routineNames,
      environment: {
        temperatureCelsius,
        humidityPercent,
        precipitationAmountMm,
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

const previousAnalysisSeeds: PreviousAnalysisSeed[] = [
  {
    requestedAtDaysAgo: 60,
    summary:
      "초기 30일 구간에서는 AC 카밍 폼클렌저 사용 주간에 트러블과 붉음 기록이 낮아지는 흐름이 있었고, 낮은 수면과 높은 습도가 겹친 날에는 피부 컨디션 점수가 내려갔습니다.",
    positiveIngredientNames: ["Salicylic Acid", "Asiaticoside", "Madecassic Acid"],
    negativeIngredientNames: ["Fragrance", "Linalool", "Limonene"],
    notableDateOffset: -73
  },
  {
    requestedAtDaysAgo: 30,
    summary:
      "두 번째 30일 구간에서도 BHA 클렌징 주간의 피부 컨디션 점수 상승 신호가 반복됐고, 포어 딥클렌징 주간에는 낮은 습도와 함께 건조함 기록이 늘었습니다.",
    positiveIngredientNames: ["Salicylic Acid", "Asiatic Acid", "Betaine Salicylate"],
    negativeIngredientNames: ["Kaolin", "Hydrated Silica", "Fragrance"],
    notableDateOffset: -43
  }
];

const seedPreviousAnalysisRuns = async (userId: string, today: string) => {
  const supabase = createSupabaseAdminClient();
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  let seededCount = 0;

  for (const seed of previousAnalysisSeeds) {
    const requestedAt = `${toDateString(addDays(todayDate, -seed.requestedAtDaysAgo))}T09:00:00+09:00`;
    const notableDate = toDateString(addDays(todayDate, seed.notableDateOffset));
    const { data, error } = await supabase
      .from("analysis_runs")
      .insert({
        user_id: userId,
        requested_at: requestedAt,
        confidence_level: "medium",
        summary: seed.summary,
        trend_points: [],
        notable_events: [
          {
            date: notableDate,
            title: "피부 점수가 평소보다 낮은 날",
            severity: "high",
            totalScore: 4,
            baselineScore: 12,
            scoreDelta: 8,
            factorTags: ["low_sleep", "high_humidity", "product_change"],
            reasons: [
              "수면 시간이 5시간대로 짧았습니다.",
              "습도가 80% 이상으로 높았습니다.",
              "전날과 다른 제품 구성이 함께 기록되었습니다."
            ],
            productNames: ["글로우 리치 나이트 크림"]
          }
        ],
        factor_summaries: [
          {
            factorTag: "low_sleep",
            label: "수면 부족",
            hitCount: 8,
            eventCount: 3,
            description: "수면 부족 조건이 특이 변화일과 반복해서 함께 나타났습니다."
          },
          {
            factorTag: "product_change",
            label: "제품 변화",
            hitCount: 6,
            eventCount: 2,
            description: "클렌저 변경 주간에 피부 컨디션 점수 변화가 함께 관찰됐습니다."
          }
        ],
        limitations: [
          "과거 분석은 데모 시연용 압축 요약이며 원인 확정이 아닙니다.",
          "제품 사용 여부와 생활 요인이 같은 날 함께 기록된 수준의 근거입니다."
        ],
        next_records_to_add: [
          "클렌저를 사용하지 않은 날의 피부 상태",
          "제품 변경 첫 3일의 수면 시간과 습도"
        ]
      })
      .select("id")
      .single();

    requireNoError(error, `Failed to seed previous analysis: ${requestedAt}`);

    const analysisRunId = idRowSchema.parse(data).id;
    const findingRows = [
      ...seed.positiveIngredientNames.map((ingredientName) => ({
        analysis_run_id: analysisRunId,
        finding_type: "positive_suspect",
        ingredient_id: null,
        ingredient_name: ingredientName,
        evidence_level: "weak",
        reason: `${ingredientName}은 과거 분석에서 피부 컨디션 점수가 오른 날 함께 기록된 긍정적 의심 성분 후보입니다.`,
        supporting_logs: ["과거 30일 구간 분석 요약에 포함", "반복 패턴 보강용 데모 데이터"]
      })),
      ...seed.negativeIngredientNames.map((ingredientName) => ({
        analysis_run_id: analysisRunId,
        finding_type: "negative_suspect",
        ingredient_id: null,
        ingredient_name: ingredientName,
        evidence_level: "weak",
        reason: `${ingredientName}은 과거 분석에서 피부 컨디션 점수가 낮아진 날 함께 기록된 부정적 의심 성분 후보입니다.`,
        supporting_logs: ["과거 30일 구간 분석 요약에 포함", "반복 패턴 보강용 데모 데이터"]
      }))
    ];

    const { error: findingsError } = await supabase
      .from("analysis_findings")
      .insert(findingRows);

    requireNoError(findingsError, `Failed to seed previous analysis findings: ${requestedAt}`);
    seededCount += 1;
  }

  return seededCount;
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
  const previousAnalysisCount = await seedPreviousAnalysisRuns(demoUser.id, todayInSeoul());
  const analysis = await runAnalysis(demoUser.id);

  console.log("Demo data seed complete");
  console.log(`Demo user: ${demoUser.email}`);
  console.log(`Demo password: ${demoUser.password}`);
  console.log(`Products: ${products.length}`);
  console.log(`Presets: ${routineSeeds.length}`);
  console.log(`Daily records: ${recordCount}`);
  console.log(`Previous analyses: ${previousAnalysisCount}`);
  console.log(`Analysis run: ${analysis.analysisRunId}`);
};

main().catch((error: unknown) => {
  console.error("Demo data seed failed");
  console.error(error);
  process.exit(1);
});
