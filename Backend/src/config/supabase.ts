import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import { ApiError } from "../types/http.js";

const requireSupabaseUrl = () => {
  if (!env.SUPABASE_URL) {
    throw new ApiError(500, "CONFIGURATION_ERROR", "SUPABASE_URL이 설정되지 않았습니다.");
  }

  return env.SUPABASE_URL;
};

export const createSupabaseAnonClient = () => {
  if (!env.SUPABASE_ANON_KEY) {
    throw new ApiError(500, "CONFIGURATION_ERROR", "SUPABASE_ANON_KEY가 설정되지 않았습니다.");
  }

  return createClient(requireSupabaseUrl(), env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false
    }
  });
};

export const createSupabaseAdminClient = () => {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError(500, "CONFIGURATION_ERROR", "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  }

  return createClient(requireSupabaseUrl(), env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

