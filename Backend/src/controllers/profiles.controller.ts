import type { RequestHandler } from "express";
import { getOrCreateProfile } from "../services/profiles.service.js";
import {
  getLocationOptions,
  getMyLocation,
  parseLocationInput,
  saveMyLocation
} from "../services/weather.service.js";
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

export const getProfileLocationOptions: RequestHandler = async (_req, res, next) => {
  try {
    res.json({
      data: getLocationOptions()
    });
  } catch (error) {
    next(error);
  }
};

export const getProfileLocation: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const location = await getMyLocation(req.userId);

    res.json({
      data: location
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfileLocation: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseLocationInput(req.body);
    const location = await saveMyLocation(req.userId, input);

    res.json({
      data: location
    });
  } catch (error) {
    next(error);
  }
};
