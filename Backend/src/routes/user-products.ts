import { Router } from "express";
import {
  createUserProductController,
  listUserProductsController
} from "../controllers/products.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const userProductsRouter = Router();

userProductsRouter.get("/", requireAuth, listUserProductsController);
userProductsRouter.post("/", requireAuth, createUserProductController);
