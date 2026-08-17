import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type SourceFile = {
  batchId: string;
  label: string;
  filePath: string;
};

type ParsedProduct = {
  externalId: string;
  source: "seed";
  seedBatch: string;
  seedOrder: number;
  name: string;
  normalizedName: string;
  brand: string;
  category: string;
  ingredientsText: string;
  verificationStatus: "verified";
  sourceUrl: string;
  sourceCheckedAt: string;
  region: "KR";
  formulaVersion: string;
};

type ParsedProductIngredient = {
  productExternalId: string;
  rawName: string;
  ingredientNameCandidate: string;
  displayOrder: number;
  amountText: string | null;
  amountStatus: "known" | "unknown";
  matchStatus: "unmatched";
};

type IngredientCandidate = {
  name: string;
  normalizedName: string;
  occurrenceCount: number;
  productCount: number;
  exampleRawNames: string[];
};

type ParseResult = {
  products: ParsedProduct[];
  productIngredients: ParsedProductIngredient[];
  duplicateProducts: Array<{
    duplicateExternalId: string;
    keptExternalId: string;
    brand: string;
    name: string;
  }>;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const backendRoot = path.resolve(scriptDir, "../..");

const sourceFiles: SourceFile[] = [
  {
    batchId: "seed_97_ko_official",
    label: "국내 공식 제품명 확인판 97종",
    filePath: path.join(
      repoRoot,
      "docs",
      "DB",
      "kbeauty_skin_products_ingredients_seed_97_ko_official_names.md"
    )
  },
  {
    batchId: "seed_additional_100_ko_official",
    label: "추가 100종",
    filePath: path.join(
      repoRoot,
      "docs",
      "DB",
      "kbeauty_skin_products_ingredients_seed_additional_100_ko_official.md"
    )
  }
];

const outputDir = path.join(backendRoot, "supabase", "seed");

const normalizeText = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");

const normalizeSearchText = (value: string) =>
  normalizeText(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const extractFirst = (content: string, pattern: RegExp, fieldName: string) => {
  const match = content.match(pattern);

  if (!match?.[1]) {
    throw new Error(`Missing field: ${fieldName}`);
  }

  return normalizeText(match[1]);
};

const parseAmountText = (rawName: string) => {
  const amountMatch = rawName.match(/(?:\(|\s)(\d[\d,.]*\s*(?:%|ppm|ppb))(?:\))?/i);
  return amountMatch?.[1]?.replace(/\s+/g, "") ?? null;
};

const normalizeIngredientCandidate = (rawName: string) =>
  normalizeText(rawName)
    .replace(/\s*\(\s*\d[\d,.]*\s*(?:%|ppm|ppb)\s*\)\s*/gi, "")
    .replace(/\s+\d[\d,.]*\s*(?:%|ppm|ppb)$/gi, "")
    .trim();

const splitIngredients = (ingredientsText: string) =>
  ingredientsText
    .split(/,\s+/u)
    .map((value) => normalizeText(value).replace(/\.$/, "").trim())
    .filter(Boolean);

const parseMarkdownProducts = async (sourceFile: SourceFile): Promise<ParseResult> => {
  const content = await readFile(sourceFile.filePath, "utf8");
  const headingPattern = /^###\s+(\d{3})\.\s+(.+?)\s+—\s+(.+)$/gmu;
  const headings = [...content.matchAll(headingPattern)];
  const products: ParsedProduct[] = [];
  const productIngredients: ParsedProductIngredient[] = [];
  const duplicateProducts: ParseResult["duplicateProducts"] = [];
  const seenByProductKey = new Map<string, ParsedProduct>();

  for (const [index, heading] of headings.entries()) {
    const fullMatch = heading[0];
    const orderText = heading[1];
    const brandText = heading[2];
    const productNameText = heading[3];
    const startIndex = heading.index ?? 0;
    const nextIndex = headings[index + 1]?.index ?? content.length;
    const block = content.slice(startIndex + fullMatch.length, nextIndex);

    if (!orderText || !brandText || !productNameText) {
      throw new Error(`Invalid product heading in ${sourceFile.filePath}`);
    }

    const seedOrder = Number.parseInt(orderText, 10);
    const brand = normalizeText(brandText);
    const name = normalizeText(productNameText);
    const category = extractFirst(block, /-\s+\*\*분류:\*\*\s*(.+)/u, "category");
    const ingredientsText = extractFirst(block, /-\s+\*\*전성분:\*\*\s*(.+)/u, "ingredientsText");
    const sourceUrl = extractFirst(block, /-\s+\*\*공식 출처:\*\*\s*(.+)/u, "sourceUrl");
    const sourceCheckedAt = extractFirst(
      block,
      /-\s+\*\*출처 확인일:\*\*\s*(.+)/u,
      "sourceCheckedAt"
    );
    const externalId = `${sourceFile.batchId}-${orderText}`;
    const productKey = `${normalizeSearchText(brand)}:${normalizeSearchText(name)}`;
    const existingProduct = seenByProductKey.get(productKey);

    if (existingProduct) {
      duplicateProducts.push({
        duplicateExternalId: externalId,
        keptExternalId: existingProduct.externalId,
        brand,
        name
      });
      continue;
    }

    const product: ParsedProduct = {
      externalId,
      source: "seed",
      seedBatch: sourceFile.batchId,
      seedOrder,
      name,
      normalizedName: normalizeText(name),
      brand,
      category,
      ingredientsText,
      verificationStatus: "verified",
      sourceUrl,
      sourceCheckedAt,
      region: "KR",
      formulaVersion: `source_checked_at:${sourceCheckedAt}`
    };

    products.push(product);
    seenByProductKey.set(productKey, product);

    splitIngredients(ingredientsText).forEach((rawName, rawIndex) => {
      const amountText = parseAmountText(rawName);
      productIngredients.push({
        productExternalId: externalId,
        rawName,
        ingredientNameCandidate: normalizeIngredientCandidate(rawName),
        displayOrder: rawIndex + 1,
        amountText,
        amountStatus: amountText ? "known" : "unknown",
        matchStatus: "unmatched"
      });
    });
  }

  return { products, productIngredients, duplicateProducts };
};

const buildIngredientCandidates = (
  productIngredients: ParsedProductIngredient[]
): IngredientCandidate[] => {
  const candidateMap = new Map<
    string,
    {
      name: string;
      normalizedName: string;
      occurrenceCount: number;
      productExternalIds: Set<string>;
      exampleRawNames: Set<string>;
    }
  >();

  productIngredients.forEach((ingredient) => {
    const normalizedName = normalizeSearchText(ingredient.ingredientNameCandidate);
    const existing = candidateMap.get(normalizedName);

    if (existing) {
      existing.occurrenceCount += 1;
      existing.productExternalIds.add(ingredient.productExternalId);
      existing.exampleRawNames.add(ingredient.rawName);
      return;
    }

    candidateMap.set(normalizedName, {
      name: ingredient.ingredientNameCandidate,
      normalizedName,
      occurrenceCount: 1,
      productExternalIds: new Set([ingredient.productExternalId]),
      exampleRawNames: new Set([ingredient.rawName])
    });
  });

  return [...candidateMap.values()]
    .map((candidate) => ({
      name: candidate.name,
      normalizedName: candidate.normalizedName,
      occurrenceCount: candidate.occurrenceCount,
      productCount: candidate.productExternalIds.size,
      exampleRawNames: [...candidate.exampleRawNames].slice(0, 5)
    }))
    .sort((left, right) =>
      right.occurrenceCount === left.occurrenceCount
        ? left.name.localeCompare(right.name, "ko")
        : right.occurrenceCount - left.occurrenceCount
    );
};

const countBy = <T>(items: T[], getKey: (item: T) => string) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

const formatCountTable = (title: string, counts: Record<string, number>) => {
  const rows = Object.entries(counts).sort((left, right) =>
    right[1] === left[1] ? left[0].localeCompare(right[0], "ko") : right[1] - left[1]
  );

  return [
    `## ${title}`,
    "",
    "| 항목 | 수 |",
    "| --- | ---: |",
    ...rows.map(([name, count]) => `| ${name} | ${count} |`),
    ""
  ].join("\n");
};

const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const toCsvValue = (value: string | number | null) => {
  if (value === null) {
    return "";
  }

  const stringValue = String(value);
  return /[",\n\r]/u.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
};

const writeProductCsv = async (products: ParsedProduct[]) => {
  const headers: Array<keyof ParsedProduct> = [
    "externalId",
    "source",
    "seedBatch",
    "seedOrder",
    "name",
    "normalizedName",
    "brand",
    "category",
    "ingredientsText",
    "verificationStatus",
    "sourceUrl",
    "sourceCheckedAt",
    "region",
    "formulaVersion"
  ];
  const lines = [
    headers.join(","),
    ...products.map((product) => headers.map((header) => toCsvValue(product[header])).join(","))
  ];

  await writeFile(path.join(outputDir, "product_seed.products.csv"), `${lines.join("\n")}\n`);
};

const writeProductIngredientsCsv = async (
  productIngredients: ParsedProductIngredient[]
) => {
  const headers: Array<keyof ParsedProductIngredient> = [
    "productExternalId",
    "rawName",
    "ingredientNameCandidate",
    "displayOrder",
    "amountText",
    "amountStatus",
    "matchStatus"
  ];
  const lines = [
    headers.join(","),
    ...productIngredients.map((ingredient) =>
      headers.map((header) => toCsvValue(ingredient[header])).join(",")
    )
  ];

  await writeFile(path.join(outputDir, "product_seed.product_ingredients.csv"), `${lines.join("\n")}\n`);
};

const writeIngredientCandidatesCsv = async (ingredientCandidates: IngredientCandidate[]) => {
  const headers: Array<keyof IngredientCandidate> = [
    "name",
    "normalizedName",
    "occurrenceCount",
    "productCount",
    "exampleRawNames"
  ];
  const lines = [
    headers.join(","),
    ...ingredientCandidates.map((candidate) =>
      headers
        .map((header) =>
          toCsvValue(
            Array.isArray(candidate[header])
              ? candidate[header].join(" | ")
              : candidate[header]
          )
        )
        .join(",")
    )
  ];

  await writeFile(
    path.join(outputDir, "product_seed.ingredient_candidates.csv"),
    `${lines.join("\n")}\n`
  );
};

const buildSummary = (
  products: ParsedProduct[],
  productIngredients: ParsedProductIngredient[],
  ingredientCandidates: IngredientCandidate[],
  duplicateProducts: ParseResult["duplicateProducts"]
) => {
  const knownAmountCount = productIngredients.filter(
    (ingredient) => ingredient.amountStatus === "known"
  ).length;
  const averageIngredientCount = productIngredients.length / products.length;
  const sourceFileSummary = sourceFiles
    .map((sourceFile) => {
      const productCount = products.filter(
        (product) => product.seedBatch === sourceFile.batchId
      ).length;
      return `| ${sourceFile.label} | \`${sourceFile.batchId}\` | ${productCount} |`;
    })
    .join("\n");
  const duplicateSummary =
    duplicateProducts.length === 0
      ? "중복 제품은 발견되지 않았다."
      : duplicateProducts
          .map(
            (duplicate) =>
              `- ${duplicate.brand} ${duplicate.name}: ${duplicate.duplicateExternalId} 중복, ${duplicate.keptExternalId} 유지`
          )
          .join("\n");

  return [
    "# Product Seed Summary",
    "",
    "> 자동 생성 파일이다. 원본은 `docs/DB/*.md`이며, 재생성은 `npm run prepare:product-seed`로 수행한다.",
    "",
    "## 전체 요약",
    "",
    "| 항목 | 수 |",
    "| --- | ---: |",
    `| 제품 | ${products.length} |`,
    `| 제품-성분 행 | ${productIngredients.length} |`,
    `| 고유 성분 후보 | ${ingredientCandidates.length} |`,
    `| 함량 표기 포함 성분 행 | ${knownAmountCount} |`,
    `| 제품당 평균 성분 수 | ${averageIngredientCount.toFixed(1)} |`,
    "",
    "## 원본 파일별 제품 수",
    "",
    "| 원본 | batch id | 제품 수 |",
    "| --- | --- | ---: |",
    sourceFileSummary,
    "",
    formatCountTable("브랜드별 제품 수", countBy(products, (product) => product.brand)),
    formatCountTable("카테고리별 제품 수", countBy(products, (product) => product.category)),
    "## 중복 검사",
    "",
    duplicateSummary,
    "",
    "## 생성 파일",
    "",
    "- `product_seed.products.json`: `products` 테이블에 넣을 제품 원천 데이터",
    "- `product_seed.product_ingredients.json`: `product_ingredients` 테이블에 넣을 제품별 전성분 순서 데이터",
    "- `product_seed.ingredient_candidates.json`: MFDS 매칭 전 성분 후보 사전",
    "- `product_seed.products.csv`: Supabase CSV import 또는 수동 검토용 제품 데이터",
    "- `product_seed.product_ingredients.csv`: Supabase CSV import 또는 수동 검토용 제품별 성분 데이터",
    "- `product_seed.ingredient_candidates.csv`: 성분 후보 검토용 CSV",
    "",
    "## Import 절차",
    "",
    "1. Supabase SQL Editor에서 `Backend/supabase/migrations/202608170001_create_product_seed_tables.sql`을 실행한다.",
    "2. `Backend/.env`에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인한다.",
    "3. `cd Backend && npm run import:product-seed`를 실행한다.",
    "",
    "## 적용 원칙",
    "",
    "- `products.source`는 `seed`로 저장한다.",
    "- `products.verification_status`는 공식 출처 기반 seed임을 고려해 `verified`로 둔다.",
    "- `product_ingredients.match_status`는 MFDS 표준 성분 매칭 전이므로 `unmatched`로 둔다.",
    "- `product_ingredients.raw_name`은 원본 전성분 표기와 순서를 보존한다.",
    "- `ingredientNameCandidate`는 함량 표기를 제거한 매칭 후보일 뿐, MFDS 표준명으로 확정하지 않는다.",
    ""
  ].join("\n");
};

const main = async () => {
  const parsedResults = await Promise.all(sourceFiles.map(parseMarkdownProducts));
  const products = parsedResults.flatMap((result) => result.products);
  const productIngredients = parsedResults.flatMap((result) => result.productIngredients);
  const duplicateProducts = parsedResults.flatMap((result) => result.duplicateProducts);
  const ingredientCandidates = buildIngredientCandidates(productIngredients);

  await mkdir(outputDir, { recursive: true });

  await writeFile(path.join(outputDir, "product_seed.products.json"), toJson(products));
  await writeFile(
    path.join(outputDir, "product_seed.product_ingredients.json"),
    toJson(productIngredients)
  );
  await writeFile(
    path.join(outputDir, "product_seed.ingredient_candidates.json"),
    toJson(ingredientCandidates)
  );
  await writeProductCsv(products);
  await writeProductIngredientsCsv(productIngredients);
  await writeIngredientCandidatesCsv(ingredientCandidates);
  await writeFile(
    path.join(outputDir, "product_seed.summary.md"),
    buildSummary(products, productIngredients, ingredientCandidates, duplicateProducts)
  );

  console.log(`Prepared ${products.length} products`);
  console.log(`Prepared ${productIngredients.length} product ingredient rows`);
  console.log(`Prepared ${ingredientCandidates.length} unique ingredient candidates`);
};

main().catch((error: unknown) => {
  console.error("Product seed preparation failed");
  console.error(error);
  process.exit(1);
});
