import mongoose from "mongoose";
export const connectDB = async () => {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error("❌ MONGODB_URI is missing from backend/.env");
    }
    if (mongoose.connection.readyState === 1) {
        console.log("ℹ️ MongoDB already connected");
        return;
    }
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected successfully");
    }
    catch (err) {
        console.error("❌ MongoDB connection failed");
        throw new Error(err instanceof Error ? err.message : "Unknown MongoDB error");
    }
};
