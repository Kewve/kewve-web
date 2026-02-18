import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { TradeProfile } from "../models/TradeProfile.js";

const router = Router();

// GET /api/trade-profile - Get current user's trade profile
router.get("/trade-profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    let profile = await TradeProfile.findOne({ userId });

    if (!profile) {
      // Return empty profile structure if none exists yet
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error("Get trade profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch trade profile",
    });
  }
});

// PUT /api/trade-profile - Create or update trade profile
router.put("/trade-profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const {
      companyName,
      country,
      description,
      yearsOfExperience,
      marketsPreviouslyExportedTo,
      monthlyProductionCapacity,
      processingMethods,
      packagingFormats,
      storageFacilities,
      sustainabilityPractices,
      traceabilitySystems,
      completedSections,
    } = req.body;

    const profile = await TradeProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        companyName,
        country,
        description,
        yearsOfExperience: Number(yearsOfExperience) || 0,
        marketsPreviouslyExportedTo,
        monthlyProductionCapacity: Number(monthlyProductionCapacity) || 0,
        processingMethods,
        packagingFormats,
        storageFacilities,
        sustainabilityPractices,
        traceabilitySystems,
        completedSections: completedSections || [],
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error("Save trade profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save trade profile",
    });
  }
});

export default router;
