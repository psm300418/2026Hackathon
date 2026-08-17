import type { RequestHandler } from "express";
import { createSupabaseAnonClient } from "../config/supabase.js";
import { ApiError } from "../types/http.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      accessToken?: string;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.header("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;

    if (!token) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new ApiError(401, "UNAUTHORIZED", "유효하지 않은 로그인 정보입니다.");
    }

    req.userId = data.user.id;
    req.accessToken = token;
    next();
  } catch (error) {
    next(error);
  }
};
