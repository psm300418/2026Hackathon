import { Router } from "express";
import {
  getMySkinTypeResult,
  getSkinTypeQuestionnaire,
  submitSkinTypeQuestionnaireResponses
} from "../controllers/skin-type.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const onboardingRouter = Router();

onboardingRouter.get("/skin-type/questions", getSkinTypeQuestionnaire);
onboardingRouter.post(
  "/skin-type/responses",
  requireAuth,
  submitSkinTypeQuestionnaireResponses
);
onboardingRouter.get("/skin-type/result", requireAuth, getMySkinTypeResult);
