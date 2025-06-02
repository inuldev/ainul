import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

// Load environment variables from .env file (skip in serverless)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

import connectDb from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import { generalRateLimit, clearAllRateLimits } from "./middleware/rateLimiter.js";
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

// Database connection middleware for serverless (only for API routes)
app.use("/api", async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://ainul.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Try to connect to database for health check
    await connectDb();

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      envVars: {
        hasMongoUrl: !!process.env.MONGODB_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasFrontendUrl: !!process.env.FRONTEND_URL,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "connection_failed",
      error: error.message,
      envVars: {
        hasMongoUrl: !!process.env.MONGODB_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasFrontendUrl: !!process.env.FRONTEND_URL,
      },
    });
  }
});

// Debug endpoint to clear rate limits (only in development)
if (process.env.NODE_ENV !== "production") {
  app.post("/debug/clear-rate-limits", (req, res) => {
    clearAllRateLimits();
    res.json({
      success: true,
      message: "All rate limits cleared",
    });
  });
}

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

// Connect to database
connectDb();

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
