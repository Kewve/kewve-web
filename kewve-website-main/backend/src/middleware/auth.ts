import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserDocument } from "../models/User.js";

export interface AuthRequest extends Request {
  user?: UserDocument;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found. Please log in again.",
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
};
