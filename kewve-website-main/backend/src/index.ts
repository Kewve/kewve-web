// Add error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Error stack:', reason.stack);
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Error stack:', error.stack);
  process.exit(1);
});

import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory (two levels up from src/)
dotenv.config({ path: resolve(__dirname, "..", ".env") });

import waitlistRoutes from "./routes/waitlistRoute.js";
import authRoutes from "./routes/authRoute.js";
import assessmentRoutes from "./routes/assessmentRoute.js";
import { connectDB } from "./config/database.js";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("MONGODB_URI:", process.env.MONGODB_URI?.slice(0, 30));

console.log("ENV CHECK:", {
  MONGODB_URI: process.env.MONGODB_URI ? "FOUND" : "MISSING",
});



const PORT = process.env.PORT || 5000;

// Connect to MongoDB before starting the server
async function startServer() {
  try {
    await connectDB();
    console.log("✅ Database connection established");

    // health check
    app.get("/health", (_req, res) => {
      res.json({ 
        status: "ok", 
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" 
      });
    });

    // routes
    app.use("/api", waitlistRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api", assessmentRoutes);

    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
