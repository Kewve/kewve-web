import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
// Get JWT_SECRET lazily to allow dotenv.config() to run first
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not set! Make sure you set it in your environment variables.");
    }
    return secret;
};
export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Authentication required. Please log in.",
            });
            return;
        }
        const decoded = jwt.verify(token, getJwtSecret());
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
    }
    catch (error) {
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
export const requireAdmin = async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
            success: false,
            message: "Admin access required.",
        });
        return;
    }
    next();
};
export const generateToken = (userId) => {
    return jwt.sign({ userId }, getJwtSecret(), { expiresIn: "30d" });
};
