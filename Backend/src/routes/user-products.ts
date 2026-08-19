import { Router } from "express";
import {
  createUserProductController,
  listUserProductsController,
  updateUserProductStatusController
} from "../controllers/products.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const userProductsRouter = Router();

userProductsRouter.get("/", requireAuth, listUserProductsController);
userProductsRouter.post("/", requireAuth, createUserProductController);
userProductsRouter.patch("/:userProductId/status", requireAuth, updateUserProductStatusController);
