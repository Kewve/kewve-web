import { User } from "../models/User.js";
import { generateToken } from "../middleware/auth.js";
export const register = async (req, res) => {
    try {
        const { email, password, name, businessName, country } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({
                success: false,
                message: "Email, password, and name are required",
            });
            return;
        }
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "User with this email already exists",
            });
            return;
        }
        // Create new user
        const user = await User.create({
            email: email.toLowerCase(),
            password,
            name,
            businessName,
            country,
        });
        // Generate token
        const token = generateToken(user._id.toString());
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    businessName: user.businessName,
                    country: user.country,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed. Please try again.",
        });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
            return;
        }
        // Find user and include password for comparison
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        // Generate token
        const token = generateToken(user._id.toString());
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    businessName: user.businessName,
                    country: user.country,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed. Please try again.",
        });
    }
};
export const getCurrentUser = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    businessName: user.businessName,
                    country: user.country,
                },
            },
        });
    }
    catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get user information",
        });
    }
};
