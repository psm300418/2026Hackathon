import { Router } from "express";
import {
  createProductPresetController,
  deleteProductPresetController,
  listProductPresetsController,
  updateProductPresetController
} from "../controllers/records.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const productPresetsRouter = Router();

productPresetsRouter.get("/", requireAuth, listProductPresetsController);
productPresetsRouter.post("/", requireAuth, createProductPresetController);
productPresetsRouter.put("/:presetId", requireAuth, updateProductPresetController);
productPresetsRouter.delete("/:presetId", requireAuth, deleteProductPresetController);
