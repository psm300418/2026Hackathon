import type { RequestHandler } from "express";
import { getAnalysis, getLatestAnalysis, runAnalysis } from "../services/analysis.service.js";
import { ApiError } from "../types/http.js";

export const runAnalysisController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const data = await runAnalysis(req.userId);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const getLatestAnalysisController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const data = await getLatestAnalysis(req.userId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getAnalysisController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const analysisRunId = req.params.analysisRunId;

    if (typeof analysisRunId !== "string") {
      throw new ApiError(400, "BAD_REQUEST", "분석 ID가 올바르지 않습니다.");
    }

    const data = await getAnalysis(req.userId, analysisRunId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};
