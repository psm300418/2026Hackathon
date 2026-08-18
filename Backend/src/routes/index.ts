import { Router } from "express";
import { analysisRouter } from "./analysis.js";
import { dailyRecordsRouter } from "./daily-records.js";
import { healthRouter } from "./health.js";
import { onboardingRouter } from "./onboarding.js";
import { productPresetsRouter } from "./product-presets.js";
import { productSubmissionsRouter } from "./product-submissions.js";
import { productsRouter } from "./products.js";
import { profileRouter } from "./profile.js";
import { userProductsRouter } from "./user-products.js";

export const router = Router();

router.use("/analysis", analysisRouter);
router.use("/daily-records", dailyRecordsRouter);
router.use("/health", healthRouter);
router.use("/onboarding", onboardingRouter);
router.use("/product-presets", productPresetsRouter);
router.use("/product-submissions", productSubmissionsRouter);
router.use("/products", productsRouter);
router.use("/profile", profileRouter);
router.use("/user-products", userProductsRouter);
