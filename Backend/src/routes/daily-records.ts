import { Router } from "express";
import multer from "multer";
import {
  createDailyRecordController,
  listDailyRecordsController
} from "../controllers/records.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const dailyRecordsRouter = Router();

dailyRecordsRouter.get("/", requireAuth, listDailyRecordsController);
dailyRecordsRouter.post("/", requireAuth, upload.single("facePhoto"), createDailyRecordController);
