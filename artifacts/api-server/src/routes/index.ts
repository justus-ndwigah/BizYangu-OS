import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import settingsRouter from "./settings";
import productsRouter from "./products";
import salesRouter from "./sales";
import customersRouter from "./customers";
import debtsRouter from "./debts";
import mpesaRouter, { mpesaPublicRouter } from "./mpesa";
import reportsRouter from "./reports";
import aiRouter from "./ai";
import backupRouter from "./backup";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

// Public routes: health checks and authentication (login needs to work
// before a session exists).
router.use(healthRouter);
router.use(authRouter);
// Safaricom posts here without a browser session — must stay public.
router.use(mpesaPublicRouter);

// Everything below requires an authenticated session.
router.use(requireAuth);
router.use(usersRouter);
router.use(settingsRouter);
router.use(productsRouter);
router.use(salesRouter);
router.use(customersRouter);
router.use(debtsRouter);
router.use(mpesaRouter);
router.use(reportsRouter);
router.use(aiRouter);
router.use(backupRouter);

export default router;
