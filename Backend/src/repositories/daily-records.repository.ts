import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type {
  DailyRecordPresetRow,
  DailyRecordProductRow,
  DailyRecordRow,
  SkinPhotoRow
} from "../types/records.js";

const dailyRecordRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  record_date: z.string(),
  logged_at: z.string(),
  dryness: z.coerce.number(),
  oiliness: z.coerce.number(),
  redness: z.coerce.number(),
  trouble: z.coerce.number(),
  sleep_hours: z.coerce.number(),
  outdoor_minutes: z.coerce.number().nullable(),
  memo: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

const dailyRecordProductRowSchema = z.object({
  id: z.string().uuid(),
  daily_record_id: z.string().uuid(),
  user_product_id: z.string().uuid(),
  created_at: z.string()
});

const dailyRecordPresetRowSchema = z.object({
  id: z.string().uuid(),
  daily_record_id: z.string().uuid(),
  routine_id: z.string().uuid(),
  created_at: z.string()
});

const skinPhotoRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  daily_record_id: z.string().uuid(),
  storage_path: z.string(),
  original_file_name: z.string().nullable(),
  content_type: z.string(),
  file_size: z.coerce.number(),
  taken_at: z.string().nullable(),
  created_at: z.string()
});

export const upsertDailyRecord = async (params: {
  userId: string;
  recordDate: string;
  dryness: number;
  oiliness: number;
  redness: number;
  trouble: number;
  sleepHours: number;
  outdoorMinutes: number | null;
  memo: string | null;
}): Promise<DailyRecordRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_records")
    .upsert(
      {
        user_id: params.userId,
        record_date: params.recordDate,
        logged_at: new Date().toISOString(),
        dryness: params.dryness,
        oiliness: params.oiliness,
        redness: params.redness,
        trouble: params.trouble,
        sleep_hours: params.sleepHours,
        outdoor_minutes: params.outdoorMinutes,
        memo: params.memo
      },
      {
        onConflict: "user_id,record_date"
      }
    )
    .select(
      [
        "id",
        "user_id",
        "record_date",
        "logged_at",
        "dryness",
        "oiliness",
        "redness",
        "trouble",
        "sleep_hours",
        "outdoor_minutes",
        "memo",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .single();

  if (error) {
    throw error;
  }

  return dailyRecordRowSchema.parse(data);
};

export const listDailyRecords = async (params: {
  userId: string;
  from: string;
  to: string;
}): Promise<DailyRecordRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_records")
    .select(
      [
        "id",
        "user_id",
        "record_date",
        "logged_at",
        "dryness",
        "oiliness",
        "redness",
        "trouble",
        "sleep_hours",
        "outdoor_minutes",
        "memo",
        "created_at",
        "updated_at"
      ].join(", ")
    )
    .eq("user_id", params.userId)
    .gte("record_date", params.from)
    .lte("record_date", params.to)
    .order("record_date", { ascending: false });

  if (error) {
    throw error;
  }

  return z.array(dailyRecordRowSchema).parse(data);
};

export const replaceDailyRecordProducts = async (
  dailyRecordId: string,
  userProductIds: string[]
): Promise<DailyRecordProductRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("daily_record_products")
    .delete()
    .eq("daily_record_id", dailyRecordId);

  if (deleteError) {
    throw deleteError;
  }

  if (userProductIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("daily_record_products")
    .insert(
      userProductIds.map((userProductId) => ({
        daily_record_id: dailyRecordId,
        user_product_id: userProductId
      }))
    )
    .select("id, daily_record_id, user_product_id, created_at");

  if (error) {
    throw error;
  }

  return z.array(dailyRecordProductRowSchema).parse(data);
};

export const replaceDailyRecordPresets = async (
  dailyRecordId: string,
  routineIds: string[]
): Promise<DailyRecordPresetRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("daily_record_presets")
    .delete()
    .eq("daily_record_id", dailyRecordId);

  if (deleteError) {
    throw deleteError;
  }

  if (routineIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("daily_record_presets")
    .insert(
      routineIds.map((routineId) => ({
        daily_record_id: dailyRecordId,
        routine_id: routineId
      }))
    )
    .select("id, daily_record_id, routine_id, created_at");

  if (error) {
    throw error;
  }

  return z.array(dailyRecordPresetRowSchema).parse(data);
};

export const listDailyRecordProducts = async (
  dailyRecordIds: string[]
): Promise<DailyRecordProductRow[]> => {
  if (dailyRecordIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_record_products")
    .select("id, daily_record_id, user_product_id, created_at")
    .in("daily_record_id", dailyRecordIds);

  if (error) {
    throw error;
  }

  return z.array(dailyRecordProductRowSchema).parse(data);
};

export const listDailyRecordPresets = async (
  dailyRecordIds: string[]
): Promise<DailyRecordPresetRow[]> => {
  if (dailyRecordIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_record_presets")
    .select("id, daily_record_id, routine_id, created_at")
    .in("daily_record_id", dailyRecordIds);

  if (error) {
    throw error;
  }

  return z.array(dailyRecordPresetRowSchema).parse(data);
};

export const listSkinPhotos = async (dailyRecordIds: string[]): Promise<SkinPhotoRow[]> => {
  if (dailyRecordIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("skin_photos")
    .select(
      [
        "id",
        "user_id",
        "daily_record_id",
        "storage_path",
        "original_file_name",
        "content_type",
        "file_size",
        "taken_at",
        "created_at"
      ].join(", ")
    )
    .in("daily_record_id", dailyRecordIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return z.array(skinPhotoRowSchema).parse(data);
};

export const replaceSkinPhotoMetadata = async (params: {
  userId: string;
  dailyRecordId: string;
  storagePath: string;
  originalFileName: string | null;
  contentType: string;
  fileSize: number;
}): Promise<SkinPhotoRow> => {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("skin_photos")
    .delete()
    .eq("daily_record_id", params.dailyRecordId);

  if (deleteError) {
    throw deleteError;
  }

  const { data, error } = await supabase
    .from("skin_photos")
    .insert({
      user_id: params.userId,
      daily_record_id: params.dailyRecordId,
      storage_path: params.storagePath,
      original_file_name: params.originalFileName,
      content_type: params.contentType,
      file_size: params.fileSize,
      taken_at: new Date().toISOString()
    })
    .select(
      [
        "id",
        "user_id",
        "daily_record_id",
        "storage_path",
        "original_file_name",
        "content_type",
        "file_size",
        "taken_at",
        "created_at"
      ].join(", ")
    )
    .single();

  if (error) {
    throw error;
  }

  return skinPhotoRowSchema.parse(data);
};

export const removeSkinPhotosForDailyRecord = async (dailyRecordId: string): Promise<SkinPhotoRow[]> => {
  const existingPhotos = await listSkinPhotos([dailyRecordId]);

  if (existingPhotos.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("skin_photos").delete().eq("daily_record_id", dailyRecordId);

  if (error) {
    throw error;
  }

  return existingPhotos;
};
