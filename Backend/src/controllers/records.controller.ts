import type { RequestHandler } from "express";
import {
  deleteProductPresetById,
  getDailyRecordTrends,
  getDailyRecords,
  getProductPresets,
  parseDailyRecordInput,
  parseDailyRecordQuery,
  parseProductPresetInput,
  saveDailyRecord,
  saveProductPreset,
  updateProductPresetById
} from "../services/records.service.js";
import { ApiError } from "../types/http.js";

export const createProductPresetController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseProductPresetInput(req.body);
    const data = await saveProductPreset(req.userId, input);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const listProductPresetsController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const items = await getProductPresets(req.userId);
    res.json({ data: { items } });
  } catch (error) {
    next(error);
  }
};

export const updateProductPresetController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    if (typeof req.params.presetId !== "string") {
      throw new ApiError(400, "BAD_REQUEST", "프리셋 ID가 올바르지 않습니다.");
    }

    const input = parseProductPresetInput(req.body);
    const data = await updateProductPresetById(req.userId, req.params.presetId, input);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const deleteProductPresetController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    if (typeof req.params.presetId !== "string") {
      throw new ApiError(400, "BAD_REQUEST", "프리셋 ID가 올바르지 않습니다.");
    }

    await deleteProductPresetById(req.userId, req.params.presetId);
    res.json({ data: { deleted: true } });
  } catch (error) {
    next(error);
  }
};

export const createDailyRecordController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseDailyRecordInput(req.body);
    const data = await saveDailyRecord(req.userId, input, req.file);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const listDailyRecordsController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseDailyRecordQuery(req.query);
    const items = await getDailyRecords(req.userId, input);
    res.json({ data: { items } });
  } catch (error) {
    next(error);
  }
};

export const getDailyRecordTrendsController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseDailyRecordQuery(req.query);
    const data = await getDailyRecordTrends(req.userId, input);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};
