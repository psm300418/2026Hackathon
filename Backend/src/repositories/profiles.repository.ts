import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import type { ProfileRow } from "../types/profiles.js";

const profileRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  display_name: z.string().nullable(),
  skin_type_code: z.string().nullable(),
  skin_type_completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

const selectColumns =
  "id, user_id, display_name, skin_type_code, skin_type_completed_at, created_at, updated_at";

export const findProfileByUserId = async (userId: string): Promise<ProfileRow | null> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(selectColumns)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? profileRowSchema.parse(data) : null;
};

export const createProfile = async (params: {
  userId: string;
  displayName?: string | null;
}): Promise<ProfileRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: params.userId,
      display_name: params.displayName ?? null
    })
    .select(selectColumns)
    .single();

  if (error) {
    throw error;
  }

  return profileRowSchema.parse(data);
};

export const updateProfileSkinType = async (params: {
  userId: string;
  skinTypeCode: string;
  completedAt: string;
}): Promise<ProfileRow> => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      skin_type_code: params.skinTypeCode,
      skin_type_completed_at: params.completedAt
    })
    .eq("user_id", params.userId)
    .select(selectColumns)
    .single();

  if (error) {
    throw error;
  }

  return profileRowSchema.parse(data);
};
