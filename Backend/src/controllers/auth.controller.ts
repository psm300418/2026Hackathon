import type { RequestHandler } from "express";
import { parseSignupInput, signupWithEmailPassword } from "../services/auth.service.js";

export const signup: RequestHandler = async (req, res, next) => {
  try {
    const input = parseSignupInput(req.body);
    const result = await signupWithEmailPassword(input);

    res.status(result.created ? 201 : 200).json({
      data: result
    });
  } catch (error) {
    next(error);
  }
};
