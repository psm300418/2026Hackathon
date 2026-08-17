import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type { ProductPresetRow, RoutineProductRow } from "../types/records.js";

const productPresetRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

const routineProductRowSchema = z.object({
  id: z.string().uuid(),
  routine_id: z.string().uuid(),
  user_product_id: z.string().uuid(),
  display_order: z.coerce.number(),
  created_at: z.string()
});

export const upsertProductPreset = async (params: {
  userId: string;
  name: string;
}): Promise<ProductPresetRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("routines")
    .upsert(
      {
        user_id: params.userId,
        name: params.name
      },
      {
        onConflict: "user_id,name"
      }
    )
    .select("id, user_id, name, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return productPresetRowSchema.parse(data);
};

export const replaceProductPresetItems = async (
  routineId: string,
  userProductIds: string[]
): Promise<RoutineProductRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("routine_products")
    .delete()
    .eq("routine_id", routineId);

  if (deleteError) {
    throw deleteError;
  }

  if (userProductIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("routine_products")
    .insert(
      userProductIds.map((userProductId, index) => ({
        routine_id: routineId,
        user_product_id: userProductId,
        display_order: index + 1
      }))
    )
    .select("id, routine_id, user_product_id, display_order, created_at")
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(routineProductRowSchema).parse(data);
};

export const listProductPresets = async (userId: string): Promise<ProductPresetRow[]> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return z.array(productPresetRowSchema).parse(data);
};

export const listProductPresetItems = async (
  routineIds: string[]
): Promise<RoutineProductRow[]> => {
  if (routineIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("routine_products")
    .select("id, routine_id, user_product_id, display_order, created_at")
    .in("routine_id", routineIds)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return z.array(routineProductRowSchema).parse(data);
};

export const listProductPresetsByIds = async (
  userId: string,
  routineIds: string[]
): Promise<ProductPresetRow[]> => {
  if (routineIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", userId)
    .in("id", routineIds);

  if (error) {
    throw error;
  }

  return z.array(productPresetRowSchema).parse(data);
};
