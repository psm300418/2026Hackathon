import { Router } from "express";
import { createSupabaseAdminClient } from "../config/supabase.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    data: {
      status: "ok",
      service: "skin-data-backend"
    }
  });
});

healthRouter.get("/supabase", async (_req, res, next) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (error) {
      throw error;
    }

    res.json({
      data: {
        status: "ok",
        service: "supabase"
      }
    });
  } catch (error) {
    next(error);
  }
});
