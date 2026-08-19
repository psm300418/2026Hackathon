import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import {
  listDailyRecordPresets,
  listDailyRecordProducts,
  listDailyRecords,
  listSkinPhotos,
  insertSkinPhotoMetadata,
  removeSkinPhotoMetadataByIds,
  replaceDailyRecordPresets,
  replaceDailyRecordProducts,
  upsertDailyRecord
} from "../repositories/daily-records.repository.js";
import { listDailyRecordEnvironments } from "../repositories/weather.repository.js";
import {
  deleteProductPreset,
  listProductPresetItems,
  listProductPresets,
  listProductPresetsByIds,
  replaceProductPresetItems,
  updateProductPreset,
  upsertProductPreset
} from "../repositories/product-presets.repository.js";
import { listUserProductsByIds } from "../repositories/user-products.repository.js";
import { getUserProducts, markUserProductsCurrent } from "./products.service.js";
import {
  attachWeatherEnvironmentToDailyRecord,
  toDailyRecordEnvironmentDto
} from "./weather.service.js";
import { ApiError } from "../types/http.js";
import type {
  DailyRecordDto,
  DailyRecordTrendsDto,
  DailyRecordPresetRow,
  DailyRecordProductRow,
  DailyRecordRow,
  ProductPresetDto,
  ProductPresetRow,
  RoutineProductRow,
  SkinPhotoDto,
  SkinPhotoRow
} from "../types/records.js";
import type { UserProductDto } from "../types/products.js";
import type { DailyRecordEnvironmentRow } from "../types/weather.js";

const SKIN_PHOTO_BUCKET = "skin-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png"]);

const todayInSeoul = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

const parseJsonStringArray = (value: unknown): string[] => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new ApiError(400, "BAD_REQUEST", "배열 형식이 올바르지 않습니다.");
    }

    return parsed.map((item) => String(item));
  }

  throw new ApiError(400, "BAD_REQUEST", "배열 형식이 올바르지 않습니다.");
};

const uniqueStrings = (values: string[]) => [...new Set(values)];

const scoreSchema = z.coerce.number().int().min(0).max(5);

const dailyRecordInputSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(todayInSeoul()),
  dryness: scoreSchema,
  oiliness: scoreSchema,
  redness: scoreSchema,
  trouble: scoreSchema,
  sleepHours: z.coerce.number().min(0).max(24).multipleOf(0.1),
  outdoorMinutes: z.coerce.number().int().min(0).optional().nullable(),
  userProductIds: z.preprocess(parseJsonStringArray, z.array(z.string().uuid())).default([]),
  appliedPresetIds: z.preprocess(parseJsonStringArray, z.array(z.string().uuid())).default([]),
  memo: z.string().trim().max(1000).optional().nullable()
});

const productPresetInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  userProductIds: z.preprocess(parseJsonStringArray, z.array(z.string().uuid()).min(1))
});

const dailyRecordQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const parseDailyRecordInput = (body: unknown) => dailyRecordInputSchema.parse(body);
export const parseProductPresetInput = (body: unknown) => productPresetInputSchema.parse(body);
export const parseDailyRecordQuery = (query: unknown) => dailyRecordQuerySchema.parse(query);

const ensureOwnedUserProducts = async (
  userId: string,
  userProductIds: string[]
): Promise<void> => {
  const uniqueUserProductIds = uniqueStrings(userProductIds);
  const userProducts = await listUserProductsByIds(userId, uniqueUserProductIds);

  if (userProducts.length !== uniqueUserProductIds.length) {
    throw new ApiError(400, "BAD_REQUEST", "내 제품 목록에 없는 제품이 포함되어 있습니다.");
  }
};

const ensureOwnedPresets = async (userId: string, presetIds: string[]): Promise<ProductPresetRow[]> => {
  const uniquePresetIds = uniqueStrings(presetIds);
  const presets = await listProductPresetsByIds(userId, uniquePresetIds);

  if (presets.length !== uniquePresetIds.length) {
    throw new ApiError(400, "BAD_REQUEST", "내 프리셋이 아닌 항목이 포함되어 있습니다.");
  }

  return presets;
};

const mapUserProductsById = (userProducts: UserProductDto[]) =>
  new Map(userProducts.map((userProduct) => [userProduct.id, userProduct]));

const groupRoutineItems = (items: RoutineProductRow[]) => {
  const itemsByRoutineId = new Map<string, RoutineProductRow[]>();

  for (const item of items) {
    const existingItems = itemsByRoutineId.get(item.routine_id) ?? [];
    existingItems.push(item);
    itemsByRoutineId.set(item.routine_id, existingItems);
  }

  return itemsByRoutineId;
};

const toProductPresetDto = (
  preset: ProductPresetRow,
  itemsByRoutineId: Map<string, RoutineProductRow[]>,
  userProductById: Map<string, UserProductDto>
): ProductPresetDto => ({
  id: preset.id,
  name: preset.name,
  products: (itemsByRoutineId.get(preset.id) ?? [])
    .map((item) => userProductById.get(item.user_product_id))
    .filter((userProduct): userProduct is UserProductDto => userProduct !== undefined),
  createdAt: preset.created_at,
  updatedAt: preset.updated_at
});

export const saveProductPreset = async (
  userId: string,
  input: {
    name: string;
    userProductIds: string[];
  }
): Promise<ProductPresetDto> => {
  const userProductIds = uniqueStrings(input.userProductIds);
  await ensureOwnedUserProducts(userId, userProductIds);

  const preset = await upsertProductPreset({ userId, name: input.name });
  const items = await replaceProductPresetItems(preset.id, userProductIds);
  const userProducts = await getUserProducts(userId);
  const userProductById = mapUserProductsById(userProducts);

  return toProductPresetDto(preset, groupRoutineItems(items), userProductById);
};

export const getProductPresets = async (userId: string): Promise<ProductPresetDto[]> => {
  const presets = await listProductPresets(userId);
  const items = await listProductPresetItems(presets.map((preset) => preset.id));
  const userProducts = await getUserProducts(userId);
  const userProductById = mapUserProductsById(userProducts);
  const itemsByRoutineId = groupRoutineItems(items);

  return presets.map((preset) => toProductPresetDto(preset, itemsByRoutineId, userProductById));
};

export const updateProductPresetById = async (
  userId: string,
  presetId: string,
  input: {
    name: string;
    userProductIds: string[];
  }
): Promise<ProductPresetDto> => {
  const userProductIds = uniqueStrings(input.userProductIds);
  await ensureOwnedUserProducts(userId, userProductIds);

  try {
    const preset = await updateProductPreset({
      userId,
      routineId: presetId,
      name: input.name
    });
    const items = await replaceProductPresetItems(preset.id, userProductIds);
    const userProducts = await getUserProducts(userId);
    const userProductById = mapUserProductsById(userProducts);

    return toProductPresetDto(preset, groupRoutineItems(items), userProductById);
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_PRESET_NOT_FOUND") {
      throw new ApiError(404, "NOT_FOUND", "프리셋을 찾을 수 없습니다.");
    }

    throw error;
  }
};

export const deleteProductPresetById = async (
  userId: string,
  presetId: string
): Promise<void> => {
  const presets = await listProductPresetsByIds(userId, [presetId]);

  if (presets.length === 0) {
    throw new ApiError(404, "NOT_FOUND", "프리셋을 찾을 수 없습니다.");
  }

  await deleteProductPreset({ userId, routineId: presetId });
};

const groupDailyRecordProducts = (items: DailyRecordProductRow[]) => {
  const itemsByDailyRecordId = new Map<string, DailyRecordProductRow[]>();

  for (const item of items) {
    const existingItems = itemsByDailyRecordId.get(item.daily_record_id) ?? [];
    existingItems.push(item);
    itemsByDailyRecordId.set(item.daily_record_id, existingItems);
  }

  return itemsByDailyRecordId;
};

const groupDailyRecordPresets = (items: DailyRecordPresetRow[]) => {
  const itemsByDailyRecordId = new Map<string, DailyRecordPresetRow[]>();

  for (const item of items) {
    const existingItems = itemsByDailyRecordId.get(item.daily_record_id) ?? [];
    existingItems.push(item);
    itemsByDailyRecordId.set(item.daily_record_id, existingItems);
  }

  return itemsByDailyRecordId;
};

const groupSkinPhotos = (photos: SkinPhotoRow[]) => {
  const photoByDailyRecordId = new Map<string, SkinPhotoRow>();

  for (const photo of photos) {
    if (!photoByDailyRecordId.has(photo.daily_record_id)) {
      photoByDailyRecordId.set(photo.daily_record_id, photo);
    }
  }

  return photoByDailyRecordId;
};

const groupDailyRecordEnvironments = (environments: DailyRecordEnvironmentRow[]) => {
  const environmentByDailyRecordId = new Map<string, DailyRecordEnvironmentRow>();

  for (const environment of environments) {
    environmentByDailyRecordId.set(environment.daily_record_id, environment);
  }

  return environmentByDailyRecordId;
};

const toSkinPhotoDto = (photo: SkinPhotoRow | undefined): SkinPhotoDto | null => {
  if (!photo) {
    return null;
  }

  return {
    id: photo.id,
    storagePath: photo.storage_path,
    contentType: photo.content_type,
    fileSize: photo.file_size
  };
};

const toDailyRecordDto = (
  record: DailyRecordRow,
  productsByDailyRecordId: Map<string, DailyRecordProductRow[]>,
  presetsByDailyRecordId: Map<string, DailyRecordPresetRow[]>,
  userProductById: Map<string, UserProductDto>,
  presetById: Map<string, ProductPresetRow>,
  photoByDailyRecordId: Map<string, SkinPhotoRow>,
  environmentByDailyRecordId: Map<string, DailyRecordEnvironmentRow>
): DailyRecordDto => ({
  id: record.id,
  recordDate: record.record_date,
  loggedAt: record.logged_at,
  dryness: record.dryness,
  oiliness: record.oiliness,
  redness: record.redness,
  trouble: record.trouble,
  sleepHours: record.sleep_hours,
  outdoorMinutes: record.outdoor_minutes,
  memo: record.memo,
  products: (productsByDailyRecordId.get(record.id) ?? [])
    .map((item) => userProductById.get(item.user_product_id))
    .filter((userProduct): userProduct is UserProductDto => userProduct !== undefined),
  appliedPresets: (presetsByDailyRecordId.get(record.id) ?? [])
    .map((item) => presetById.get(item.routine_id))
    .filter((preset): preset is ProductPresetRow => preset !== undefined)
    .map((preset) => ({ id: preset.id, name: preset.name })),
  environment: toDailyRecordEnvironmentDto(environmentByDailyRecordId.get(record.id)),
  facePhoto: toSkinPhotoDto(photoByDailyRecordId.get(record.id)),
  createdAt: record.created_at,
  updatedAt: record.updated_at
});

const getPresetProductIds = async (presetIds: string[]) => {
  const presetItems = await listProductPresetItems(presetIds);
  return presetItems.map((item) => item.user_product_id);
};

const replaceDailyRecordPhoto = async (
  userId: string,
  recordId: string,
  file: Express.Multer.File | undefined
): Promise<void> => {
  if (!file) {
    return;
  }

  if (!ACCEPTED_PHOTO_TYPES.has(file.mimetype)) {
    throw new ApiError(400, "BAD_REQUEST", "얼굴 사진은 JPEG 또는 PNG만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw new ApiError(400, "BAD_REQUEST", "얼굴 사진은 5MB 이하만 업로드할 수 있습니다.");
  }

  const supabase = createSupabaseAdminClient();
  const existingPhotos = await listSkinPhotos([recordId]);
  const extension = file.mimetype === "image/png" ? "png" : "jpg";
  const storagePath = `${userId}/${recordId}/face-photo-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(SKIN_PHOTO_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true
    });

  if (uploadError) {
    throw uploadError;
  }

  await insertSkinPhotoMetadata({
    userId,
    dailyRecordId: recordId,
    storagePath,
    originalFileName: file.originalname || null,
    contentType: file.mimetype,
    fileSize: file.size
  });

  try {
    await removeSkinPhotoMetadataByIds(existingPhotos.map((photo) => photo.id));

    if (existingPhotos.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(SKIN_PHOTO_BUCKET)
        .remove(existingPhotos.map((photo) => photo.storage_path));

      if (removeError) {
        console.warn("Failed to remove previous skin photos", removeError);
      }
    }
  } catch (error) {
    console.warn("Failed to clean up previous skin photo metadata", error);
  }
};

export const saveDailyRecord = async (
  userId: string,
  input: {
    recordDate: string;
    dryness: number;
    oiliness: number;
    redness: number;
    trouble: number;
    sleepHours: number;
    outdoorMinutes?: number | null;
    userProductIds: string[];
    appliedPresetIds: string[];
    memo?: string | null;
  },
  file?: Express.Multer.File
): Promise<DailyRecordDto> => {
  const presetIds = uniqueStrings(input.appliedPresetIds);
  const userProductIdsFromInput = uniqueStrings(input.userProductIds);
  const presets = await ensureOwnedPresets(userId, presetIds);
  const presetProductIds = await getPresetProductIds(presetIds);
  const userProductIds = uniqueStrings([...userProductIdsFromInput, ...presetProductIds]);

  await ensureOwnedUserProducts(userId, userProductIds);

  const record = await upsertDailyRecord({
    userId,
    recordDate: input.recordDate,
    dryness: input.dryness,
    oiliness: input.oiliness,
    redness: input.redness,
    trouble: input.trouble,
    sleepHours: input.sleepHours,
    outdoorMinutes: input.outdoorMinutes ?? null,
    memo: input.memo ?? null
  });

  await replaceDailyRecordProducts(record.id, userProductIds);
  await markUserProductsCurrent(userId, userProductIds);
  await replaceDailyRecordPresets(record.id, presetIds);
  await replaceDailyRecordPhoto(userId, record.id, file);
  const environments: DailyRecordEnvironmentRow[] = [];

  try {
    const environment = await attachWeatherEnvironmentToDailyRecord({
      userId,
      dailyRecordId: record.id,
      baseDate: new Date(record.logged_at)
    });

    if (environment) {
      environments.push(environment);
    }
  } catch (error) {
    console.warn("Failed to attach weather environment", error);
  }

  const products = await listDailyRecordProducts([record.id]);
  const recordPresets = await listDailyRecordPresets([record.id]);
  const photos = await listSkinPhotos([record.id]);
  const userProducts = await getUserProducts(userId);
  const userProductById = mapUserProductsById(userProducts);
  const presetById = new Map(presets.map((preset) => [preset.id, preset]));

  return toDailyRecordDto(
    record,
    groupDailyRecordProducts(products),
    groupDailyRecordPresets(recordPresets),
    userProductById,
    presetById,
    groupSkinPhotos(photos),
    groupDailyRecordEnvironments(environments)
  );
};

export const getDailyRecords = async (
  userId: string,
  query: {
    from?: string;
    to?: string;
  }
): Promise<DailyRecordDto[]> => {
  const today = todayInSeoul();
  const from = query.from ?? query.to ?? today;
  const to = query.to ?? query.from ?? today;

  if (from > to) {
    throw new ApiError(400, "BAD_REQUEST", "조회 시작일은 종료일보다 늦을 수 없습니다.");
  }

  const records = await listDailyRecords({ userId, from, to });
  const recordIds = records.map((record) => record.id);
  const products = await listDailyRecordProducts(recordIds);
  const recordPresets = await listDailyRecordPresets(recordIds);
  const photos = await listSkinPhotos(recordIds);
  const environments = await listDailyRecordEnvironments(recordIds);
  const userProducts = await getUserProducts(userId);
  const userProductById = mapUserProductsById(userProducts);
  const presetIds = uniqueStrings(recordPresets.map((preset) => preset.routine_id));
  const presets = await listProductPresetsByIds(userId, presetIds);
  const presetById = new Map(presets.map((preset) => [preset.id, preset]));

  return records.map((record) =>
    toDailyRecordDto(
      record,
      groupDailyRecordProducts(products),
      groupDailyRecordPresets(recordPresets),
      userProductById,
      presetById,
      groupSkinPhotos(photos),
      groupDailyRecordEnvironments(environments)
    )
  );
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const datesBetween = (from: string, to: string): string[] => {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const dates: string[] = [];

  for (let cursor = fromDate; cursor <= toDate; cursor = addDays(cursor, 1)) {
    dates.push(toDateString(cursor));
  }

  return dates;
};

export const getDailyRecordTrends = async (
  userId: string,
  query: {
    from?: string;
    to?: string;
  }
): Promise<DailyRecordTrendsDto> => {
  const today = todayInSeoul();
  const to = query.to ?? query.from ?? today;
  const from = query.from ?? query.to ?? toDateString(addDays(new Date(`${to}T00:00:00.000Z`), -13));

  if (from > to) {
    throw new ApiError(400, "BAD_REQUEST", "조회 시작일은 종료일보다 늦을 수 없습니다.");
  }

  const records = await getDailyRecords(userId, { from, to });
  const recordByDate = new Map(records.map((record) => [record.recordDate, record]));

  return {
    from,
    to,
    points: datesBetween(from, to).map((date) => {
      const record = recordByDate.get(date);
      const productNames = record?.products.map((product) => product.product.name) ?? [];
      const names = productNames.slice(0, 3);

      return {
        date,
        scores: {
          dryness: record?.dryness ?? null,
          oiliness: record?.oiliness ?? null,
          redness: record?.redness ?? null,
          trouble: record?.trouble ?? null
        },
        sleepHours: record?.sleepHours ?? null,
        outdoorMinutes: record?.outdoorMinutes ?? null,
        productSummary: {
          count: productNames.length,
          names,
          remainingCount: Math.max(productNames.length - names.length, 0)
        },
        environment: record?.environment ?? null
      };
    })
  };
};
