import type { RequestHandler } from "express";
import { getOrCreateProfile } from "../services/profiles.service.js";
import { ApiError } from "../types/http.js";

export const getMyProfile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const profile = await getOrCreateProfile(req.userId);

    res.json({
      data: profile
    });
  } catch (error) {
    next(error);
  }
};
