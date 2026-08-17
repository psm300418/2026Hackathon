import { Router } from "express";
import {
  createProductPresetController,
  listProductPresetsController
} from "../controllers/records.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const productPresetsRouter = Router();

productPresetsRouter.get("/", requireAuth, listProductPresetsController);
productPresetsRouter.post("/", requireAuth, createProductPresetController);
