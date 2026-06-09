import cors, { type CorsOptions } from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { createApiRouter } from "./presentation/http/routes";

const app = express();
const port = Number(process.env.PORT || 4000);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS origin is not allowed"));
  }
};

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Слишком много попыток входа. Повторите попытку позже."
  }
});

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/auth/login", loginRateLimiter);
app.use("/api", createApiRouter());

app.get("/", (_request, response) => {
  response.json({
    service: "mdm-backend",
    status: "running",
    api: "/api"
  });
});

app.listen(port, () => {
  console.log(`MDM backend started: http://localhost:${port}`);
});
