import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { authMiddleware } from "./middlewares/authMiddleware";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(authMiddleware);

app.use("/api", router, notFoundHandler);

// When STATIC_DIR is set (desktop app / single-server deployment), also serve
// the built frontend from this same server so the whole app is one origin —
// no CORS or base-URL configuration needed on the client.
const staticDir = process.env.STATIC_DIR;
if (staticDir && fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use(errorHandler);

export default app;
