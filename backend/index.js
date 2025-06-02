import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Load environment variables from .env file (skip in serverless)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

import connectDb from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import { generalRateLimit } from "./middleware/rateLimiter.js";
import logger, { requestLogger, errorLogger } from "./middleware/logger.js";

const app = express();
const port = process.env.PORT || 8000;

// Trust proxy for accurate IP addresses (skip in serverless)
if (process.env.NODE_ENV !== "production") {
  app.set("trust proxy", 1);
}

// Global rate limiting
app.use(generalRateLimit);

// Request logging
app.use(requestLogger);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
  });
});

// Global error handler
app.use(errorLogger);

// Graceful shutdown (skip in serverless)
if (process.env.NODE_ENV !== "production") {
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down gracefully");
    process.exit(0);
  });
}

// Connect to database immediately (skip in serverless)
if (process.env.NODE_ENV !== "production") {
  connectDb();
}

// Local development server (only if not in production)
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    logger.info(`Server started on port ${port}`, {
      port,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  });
}

// Export the app for Vercel serverless functions
export default app;
