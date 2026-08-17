import { Router } from "express";
import { healthRouter } from "./health.js";
import { onboardingRouter } from "./onboarding.js";
import { profileRouter } from "./profile.js";

export const router = Router();

router.use("/health", healthRouter);
router.use("/onboarding", onboardingRouter);
router.use("/profile", profileRouter);
