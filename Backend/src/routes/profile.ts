import { Router } from "express";
import {
  getMyProfile,
  getProfileLocation,
  getProfileLocationOptions,
  updateProfileLocation
} from "../controllers/profiles.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const profileRouter = Router();

profileRouter.get("/me", requireAuth, getMyProfile);
profileRouter.get("/location-options", getProfileLocationOptions);
profileRouter.get("/location", requireAuth, getProfileLocation);
profileRouter.put("/location", requireAuth, updateProfileLocation);
