import type { ErrorRequestHandler } from "express";
import { ApiError } from "../types/http.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "서버 오류가 발생했습니다."
    }
  });
};

