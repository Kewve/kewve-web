import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
// Ensure JWT_SECRET exists
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set! Make sure you set it in your environment variables.");
}
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
        const decoded = jwt.verify(token, JWT_SECRET);
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
export const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
};
