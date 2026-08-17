import type { RequestHandler } from "express";
import { ApiError } from "../types/http.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, "NOT_FOUND", `${req.method} ${req.path} API를 찾을 수 없습니다.`));
};

