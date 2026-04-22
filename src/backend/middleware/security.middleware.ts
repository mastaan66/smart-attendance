import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { Express } from "express";

export const setupSecurity = (app: Express) => {
  // 1. Security Headers
  app.use(helmet());

  // 2. Request Logging
  app.use(morgan('combined')); // Production-grade Apache style logging

  // 3. Rate Limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: "Too many attempts from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting specifically to auth routes
  app.use("/api/auth/", authLimiter);
};

export const logger = {
  info: (msg: string) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, err),
};
