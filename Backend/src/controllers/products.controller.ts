import type { RequestHandler } from "express";
import {
  getUserProducts,
  parseProductSearchQuery,
  parseUserProductInput,
  saveUserProduct,
  searchProductCatalog
} from "../services/products.service.js";
import { ApiError } from "../types/http.js";

export const searchProductsController: RequestHandler = async (req, res, next) => {
  try {
    const input = parseProductSearchQuery(req.query);
    const data = await searchProductCatalog(input);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const createUserProductController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const input = parseUserProductInput(req.body);
    const data = await saveUserProduct(req.userId, input);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const listUserProductsController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const data = await getUserProducts(req.userId);
    res.json({ data: { items: data } });
  } catch (error) {
    next(error);
  }
};
