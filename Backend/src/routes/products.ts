import { Router } from "express";
import { searchProductsController } from "../controllers/products.controller.js";

export const productsRouter = Router();

productsRouter.get("/search", searchProductsController);
