import { Router, Request, Response } from "express";
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  upgradeBuyerFromPayment,
  enableBuyerRole,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

router.post("/check-email", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.exists({ email: normalizedEmail });
    res.json({ success: true, data: { exists: !!exists } });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ success: false, message: "Failed to check email" });
  }
});

router.post("/register", register);
router.post("/upgrade-buyer-from-payment", upgradeBuyerFromPayment);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.get("/me", authenticate, getCurrentUser);
router.put("/profile", authenticate, updateProfile);
router.post("/enable-buyer-role", authenticate, enableBuyerRole);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
