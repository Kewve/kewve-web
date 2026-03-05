import { Router, Request, Response } from "express";
import { register, login, getCurrentUser, updateProfile, forgotPassword, resetPassword } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

// Check if email is already registered (no auth required)
router.post("/check-email", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }
    const exists = await User.exists({ email: email.toLowerCase().trim() });
    res.json({ success: true, data: { exists: !!exists } });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ success: false, message: "Failed to check email" });
  }
});

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getCurrentUser);
router.put("/profile", authenticate, updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
