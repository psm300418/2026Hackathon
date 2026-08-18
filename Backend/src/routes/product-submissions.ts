import { Router } from "express";
import multer from "multer";
import {
  confirmProductSubmissionController,
  extractProductSubmissionController
} from "../controllers/product-submissions.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const productSubmissionsRouter = Router();

productSubmissionsRouter.post(
  "/extract",
  requireAuth,
  upload.single("ingredientLabelImage"),
  extractProductSubmissionController
);
productSubmissionsRouter.post("/", requireAuth, confirmProductSubmissionController);
