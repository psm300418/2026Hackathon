import type { UserProductDto } from "./products.js";
import type { DailyRecordEnvironmentDto } from "./weather.js";

export type ProductPresetRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type RoutineProductRow = {
  id: string;
  routine_id: string;
  user_product_id: string;
  display_order: number;
  created_at: string;
};

export type DailyRecordRow = {
  id: string;
  user_id: string;
  record_date: string;
  logged_at: string;
  dryness: number;
  oiliness: number;
  redness: number;
  trouble: number;
  sleep_hours: number;
  outdoor_minutes: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyRecordProductRow = {
  id: string;
  daily_record_id: string;
  user_product_id: string;
  created_at: string;
};

export type DailyRecordPresetRow = {
  id: string;
  daily_record_id: string;
  routine_id: string;
  created_at: string;
};

export type SkinPhotoRow = {
  id: string;
  user_id: string;
  daily_record_id: string;
  storage_path: string;
  original_file_name: string | null;
  content_type: string;
  file_size: number;
  taken_at: string | null;
  created_at: string;
};

export type ProductPresetDto = {
  id: string;
  name: string;
  products: UserProductDto[];
  createdAt: string;
  updatedAt: string;
};

export type SkinPhotoDto = {
  id: string;
  storagePath: string;
  contentType: string;
  fileSize: number;
};

export type DailyRecordDto = {
  id: string;
  recordDate: string;
  loggedAt: string;
  dryness: number;
  oiliness: number;
  redness: number;
  trouble: number;
  sleepHours: number;
  outdoorMinutes: number | null;
  memo: string | null;
  products: UserProductDto[];
  appliedPresets: Pick<ProductPresetDto, "id" | "name">[];
  environment: DailyRecordEnvironmentDto | null;
  facePhoto: SkinPhotoDto | null;
  createdAt: string;
  updatedAt: string;
};

export type DailyRecordTrendPointDto = {
  date: string;
  scores: {
    dryness: number | null;
    oiliness: number | null;
    redness: number | null;
    trouble: number | null;
  };
  sleepHours: number | null;
  outdoorMinutes: number | null;
  productSummary: {
    count: number;
    names: string[];
    remainingCount: number;
  };
  environment: DailyRecordEnvironmentDto | null;
};

export type DailyRecordTrendsDto = {
  from: string;
  to: string;
  points: DailyRecordTrendPointDto[];
};
