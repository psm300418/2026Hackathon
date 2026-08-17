import type { RequestHandler } from "express";
import { ZodError } from "zod";
import {
  getLatestSkinTypeResult,
  getSkinTypeQuestions,
  parseSkinTypeResponseInput,
  submitSkinTypeResponses
} from "../services/skin-type.service.js";
import { ApiError } from "../types/http.js";

export const getSkinTypeQuestionnaire: RequestHandler = async (_req, res, next) => {
  try {
    const questionnaire = await getSkinTypeQuestions();

    res.json({
      data: questionnaire
    });
  } catch (error) {
    next(error);
  }
};

export const submitSkinTypeQuestionnaireResponses: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseSkinTypeResponseInput(req.body);
    const result = await submitSkinTypeResponses(req.userId, input);

    res.status(201).json({
      data: result
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, "BAD_REQUEST", "설문 응답 형식이 올바르지 않습니다."));
      return;
    }

    next(error);
  }
};

export const getMySkinTypeResult: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const result = await getLatestSkinTypeResult(req.userId);

    res.json({
      data: result
    });
  } catch (error) {
    next(error);
  }
};
