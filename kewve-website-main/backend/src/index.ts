import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory (two levels up from src/)
dotenv.config({ path: resolve(__dirname, "..", ".env") });

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
import jwt from "jsonwebtoken";

import waitlistRoutes from "./routes/waitlistRoute.js";
import authRoutes from "./routes/authRoute.js";
import assessmentRoutes from "./routes/assessmentRoute.js";
import tradeProfileRoutes from "./routes/tradeProfileRoute.js";
import productRoutes from "./routes/productRoute.js";
import adminRoutes from "./routes/adminRoute.js";
import { connectDB } from "./config/database.js";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// CORS configuration - supports multiple origins via comma-separated FRONTEND_URL
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((allowed) => origin === allowed || origin.endsWith(".vercel.app"))) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("MONGODB_URI:", process.env.MONGODB_URI ? "FOUND" : "MISSING");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "FOUND" : "MISSING");
console.log("PORT:", process.env.PORT || 5000);



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

    // Admin login - must be BEFORE all other routes
    app.post("/api/admin/login", (req, res) => {
      const { email, password } = req.body;
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) { res.status(500).json({ success: false, message: "Admin credentials not configured in .env" }); return; }
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) { res.status(401).json({ success: false, message: "Invalid admin credentials" }); return; }
      const secret = process.env.JWT_SECRET;
      if (!secret) { res.status(500).json({ success: false, message: "JWT_SECRET not set" }); return; }
      const token = jwt.sign({ adminEmail: ADMIN_EMAIL, role: "admin" }, secret, { expiresIn: "30d" });
      res.json({ success: true, message: "Admin login successful", data: { user: { id: "admin", email: ADMIN_EMAIL, name: "Admin", role: "admin" }, token } });
    });

    // routes — admin routes must come BEFORE assessment routes
    // because assessmentRoutes uses router.use(authenticate) which
    // intercepts ALL /api/* requests and rejects admin tokens
    app.use("/api", adminRoutes);
    app.use("/api", waitlistRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api", assessmentRoutes);
    app.use("/api", tradeProfileRoutes);
    app.use("/api", productRoutes);

    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
