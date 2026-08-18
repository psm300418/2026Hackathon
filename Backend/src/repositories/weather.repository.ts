import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type {
  DailyRecordEnvironmentRow,
  UserLocationRow
} from "../types/weather.js";

const userLocationRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  region_label: z.string(),
  weather_station_id: z.coerce.number().int(),
  weather_station_name: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

const dailyRecordEnvironmentRowSchema = z.object({
  id: z.string().uuid(),
  daily_record_id: z.string().uuid(),
  source: z.string(),
  region_label: z.string().nullable(),
  weather_station_id: z.coerce.number().int().nullable(),
  weather_station_name: z.string().nullable(),
  observed_at: z.string().nullable(),
  temperature_celsius: z.coerce.number().nullable(),
  humidity_percent: z.coerce.number().nullable(),
  precipitation_amount_mm: z.coerce.number().nullable(),
  wind_speed_mps: z.coerce.number().nullable(),
  raw_payload: z.record(z.unknown()).nullable(),
  created_at: z.string()
});

const userLocationColumns = [
  "id",
  "user_id",
  "region_label",
  "weather_station_id",
  "weather_station_name",
  "created_at",
  "updated_at"
].join(", ");

const dailyRecordEnvironmentColumns = [
  "id",
  "daily_record_id",
  "source",
  "region_label",
  "weather_station_id",
  "weather_station_name",
  "observed_at",
  "temperature_celsius",
  "humidity_percent",
  "precipitation_amount_mm",
  "wind_speed_mps",
  "raw_payload",
  "created_at"
].join(", ");

export const findUserLocation = async (userId: string): Promise<UserLocationRow | null> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_locations")
    .select(userLocationColumns)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? userLocationRowSchema.parse(data) : null;
};

export const upsertUserLocation = async (params: {
  userId: string;
  regionLabel: string;
  weatherStationId: number;
  weatherStationName: string;
}): Promise<UserLocationRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_locations")
    .upsert(
      {
        user_id: params.userId,
        region_label: params.regionLabel,
        weather_station_id: params.weatherStationId,
        weather_station_name: params.weatherStationName
      },
      { onConflict: "user_id" }
    )
    .select(userLocationColumns)
    .single();

  if (error) {
    throw error;
  }

  return userLocationRowSchema.parse(data);
};

export const upsertDailyRecordEnvironment = async (params: {
  dailyRecordId: string;
  regionLabel: string;
  weatherStationId: number;
  weatherStationName: string;
  observedAt: string;
  temperatureCelsius: number | null;
  humidityPercent: number | null;
  precipitationAmountMm: number | null;
  windSpeedMps: number | null;
  rawPayload: Record<string, unknown>;
}): Promise<DailyRecordEnvironmentRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_record_environment")
    .upsert(
      {
        daily_record_id: params.dailyRecordId,
        source: "kma",
        region_label: params.regionLabel,
        weather_station_id: params.weatherStationId,
        weather_station_name: params.weatherStationName,
        observed_at: params.observedAt,
        temperature_celsius: params.temperatureCelsius,
        humidity_percent: params.humidityPercent,
        precipitation_amount_mm: params.precipitationAmountMm,
        wind_speed_mps: params.windSpeedMps,
        raw_payload: params.rawPayload
      },
      { onConflict: "daily_record_id" }
    )
    .select(dailyRecordEnvironmentColumns)
    .single();

  if (error) {
    throw error;
  }

  return dailyRecordEnvironmentRowSchema.parse(data);
};

export const listDailyRecordEnvironments = async (
  dailyRecordIds: string[]
): Promise<DailyRecordEnvironmentRow[]> => {
  if (dailyRecordIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_record_environment")
    .select(dailyRecordEnvironmentColumns)
    .in("daily_record_id", dailyRecordIds);

  if (error) {
    throw error;
  }

  return z.array(dailyRecordEnvironmentRowSchema).parse(data);
};
