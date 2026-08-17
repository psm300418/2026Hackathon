import { Router } from "express";
import { getMyProfile } from "../controllers/profiles.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const profileRouter = Router();

profileRouter.get("/me", requireAuth, getMyProfile);
