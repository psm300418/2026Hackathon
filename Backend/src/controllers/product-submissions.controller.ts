import type { RequestHandler } from "express";
import {
  confirmProductSubmission,
  extractProductSubmission,
  parseProductSubmissionConfirmInput,
  parseProductSubmissionExtractInput
} from "../services/product-submissions.service.js";
import { ApiError } from "../types/http.js";

export const extractProductSubmissionController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseProductSubmissionExtractInput(req.body);
    const data = await extractProductSubmission(input, req.file);

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const confirmProductSubmissionController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseProductSubmissionConfirmInput(req.body);
    const data = await confirmProductSubmission(req.userId, input);

    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};
