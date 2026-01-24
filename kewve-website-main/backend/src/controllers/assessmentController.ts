import { Response } from "express";
import { Assessment } from "../models/Assessment.js";
import { AuthRequest } from "../middleware/auth.js";
import { AssessmentInput } from "../types/assessment.js";

export const createOrUpdateAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id; // Keep as ObjectId, not string
    const assessmentData = req.body as Partial<AssessmentInput>;

    // Remove userId from body if present (we use authenticated user)
    delete assessmentData.userId;

    // Find existing assessment or create new one
    const assessment = await Assessment.findOneAndUpdate(
      { userId },
      {
        ...assessmentData,
        userId,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Assessment saved successfully",
      data: assessment,
    });
  } catch (error: any) {
    console.error("Assessment save error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save assessment",
    });
  }
};

export const getAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    const assessment = await Assessment.findOne({ userId });

    if (!assessment) {
      res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
      return;
    }

    // Convert to plain object and exclude file data from response (only include metadata)
    const assessmentObj = assessment.toObject();
    if (assessmentObj.documents) {
      assessmentObj.documents = assessmentObj.documents.map((doc: any) => ({
        _id: doc._id,
        name: doc.name,
        type: doc.type,
        size: doc.size || 0,
        url: doc.url, // Include url for old documents
        uploadedAt: doc.uploadedAt,
        // Exclude data field - it's large and should be fetched separately
      }));
    }

    res.status(200).json({
      success: true,
      data: assessmentObj,
    });
  } catch (error) {
    console.error("Get assessment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get assessment",
    });
  }
};

export const updateChecklistState = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id; // Keep as ObjectId, not string
    const { checklistState } = req.body;

    if (!checklistState) {
      res.status(400).json({
        success: false,
        message: "Checklist state is required",
      });
      return;
    }

    const assessment = await Assessment.findOneAndUpdate(
      { userId },
      { checklistState },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Checklist state updated successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Update checklist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update checklist state",
    });
  }
};
