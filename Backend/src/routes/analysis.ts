import { Router } from "express";
import {
  getAnalysisController,
  getLatestAnalysisController,
  runAnalysisController
} from "../controllers/analysis.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const analysisRouter = Router();

analysisRouter.post("/run", requireAuth, runAnalysisController);
analysisRouter.get("/latest", requireAuth, getLatestAnalysisController);
analysisRouter.get("/runs/:analysisRunId", requireAuth, getAnalysisController);
