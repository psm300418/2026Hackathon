import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type { UsageStatus, UserProductRow } from "../types/products.js";

const userProductRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
  usage_status: z.enum(["current", "past", "paused"]),
  started_at: z.string().nullable(),
  is_past_experience: z.boolean(),
  past_reaction_memo: z.string().nullable(),
  memo: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  products: z
    .object({
      id: z.string().uuid(),
      source: z.enum(["seed", "community", "admin"]),
      item_type: z.enum(["cosmetic", "shower_product", "supplement"]),
      name: z.string(),
      normalized_name: z.string(),
      brand: z.string(),
      category: z.string().nullable(),
      ingredients_text: z.string().nullable(),
      verification_status: z.enum(["community", "verified", "needs_review"]),
      created_at: z.string(),
      updated_at: z.string()
    })
    .nullable()
});

const userProductSelect = [
  "id",
  "user_id",
  "product_id",
  "usage_status",
  "started_at",
  "is_past_experience",
  "past_reaction_memo",
  "memo",
  "created_at",
  "updated_at",
  "products(id, source, item_type, name, normalized_name, brand, category, ingredients_text, verification_status, created_at, updated_at)"
].join(", ");

export const upsertUserProduct = async (params: {
  userId: string;
  productId: string;
  usageStatus: UsageStatus;
  startedAt: string | null;
  isPastExperience: boolean;
  pastReactionMemo: string | null;
  memo: string | null;
}): Promise<UserProductRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_products")
    .upsert(
      {
        user_id: params.userId,
        product_id: params.productId,
        usage_status: params.usageStatus,
        started_at: params.startedAt,
        is_past_experience: params.isPastExperience,
        past_reaction_memo: params.pastReactionMemo,
        memo: params.memo
      },
      {
        onConflict: "user_id,product_id"
      }
    )
    .select(userProductSelect)
    .single();

  if (error) {
    throw error;
  }

  return userProductRowSchema.parse(data);
};

export const listUserProducts = async (userId: string): Promise<UserProductRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_products")
    .select(userProductSelect)
    .eq("user_id", userId)
    .order("usage_status", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return z.array(userProductRowSchema).parse(data);
};

export const listUserProductsByIds = async (
  userId: string,
  userProductIds: string[]
): Promise<UserProductRow[]> => {
  if (userProductIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_products")
    .select(userProductSelect)
    .eq("user_id", userId)
    .in("id", userProductIds);

  if (error) {
    throw error;
  }

  return z.array(userProductRowSchema).parse(data);
};

export const updateUserProductStatus = async (params: {
  userId: string;
  userProductId: string;
  usageStatus: UsageStatus;
}): Promise<UserProductRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_products")
    .update({ usage_status: params.usageStatus })
    .eq("user_id", params.userId)
    .eq("id", params.userProductId)
    .select(userProductSelect)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("USER_PRODUCT_NOT_FOUND");
  }

  return userProductRowSchema.parse(data);
};

export const updateUserProductStatuses = async (params: {
  userId: string;
  userProductIds: string[];
  usageStatus: UsageStatus;
}): Promise<void> => {
  if (params.userProductIds.length === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("user_products")
    .update({ usage_status: params.usageStatus })
    .eq("user_id", params.userId)
    .in("id", params.userProductIds);

  if (error) {
    throw error;
  }
};

const dailyRecordProductUseRowSchema = z.object({
  user_product_id: z.string().uuid(),
  daily_records: z
    .union([
      z.object({ record_date: z.string() }),
      z.array(z.object({ record_date: z.string() })).transform((records) => records[0])
    ])
    .refine((record) => record !== undefined, "daily_records relation is empty")
});

export const listLatestUsedDatesByUserProductId = async (
  userId: string,
  userProductIds: string[]
): Promise<Map<string, string>> => {
  if (userProductIds.length === 0) {
    return new Map();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_record_products")
    .select("user_product_id, daily_records!inner(record_date, user_id)")
    .in("user_product_id", userProductIds)
    .eq("daily_records.user_id", userId);

  if (error) {
    throw error;
  }

  const latestDateById = new Map<string, string>();

  for (const row of z.array(dailyRecordProductUseRowSchema).parse(data)) {
    const existingDate = latestDateById.get(row.user_product_id);
    if (!existingDate || row.daily_records.record_date > existingDate) {
      latestDateById.set(row.user_product_id, row.daily_records.record_date);
    }
  }

  return latestDateById;
};
