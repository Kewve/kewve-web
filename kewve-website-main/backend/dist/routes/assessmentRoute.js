import { Router } from "express";
import { createOrUpdateAssessment, getAssessment, updateChecklistState, } from "../controllers/assessmentController.js";
import { authenticate } from "../middleware/auth.js";
const router = Router();
// All assessment routes require authentication
router.use(authenticate);
router.post("/assessment", createOrUpdateAssessment);
router.get("/assessment", getAssessment);
router.put("/assessment", createOrUpdateAssessment);
router.put("/assessment/checklist", updateChecklistState);
// Document routes - import dynamically to avoid ESM issues
router.post("/assessment/documents", async (req, res, next) => {
    try {
        const multerModule = await import("multer");
        const multer = multerModule.default;
        const { uploadDocument } = await import("../controllers/documentController.js");
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                const allowedTypes = [
                    "application/pdf",
                    "image/jpeg",
                    "image/png",
                    "image/jpg",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ];
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                }
                else {
                    cb(new Error("Invalid file type. Only PDF, images, and Word documents are allowed."));
                }
            },
        });
        const singleUpload = upload.single("document");
        singleUpload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            try {
                await uploadDocument(req, res);
            }
            catch (error) {
                console.error("Upload document error:", error);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: error?.message || "Failed to upload document"
                    });
                }
            }
        });
    }
    catch (error) {
        console.error("Document upload route setup error:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error?.message || "Failed to process upload"
            });
        }
    }
});
router.get("/assessment/documents/:documentId", async (req, res) => {
    try {
        const { getDocument } = await import("../controllers/documentController.js");
        getDocument(req, res);
    }
    catch (error) {
        console.error("Get document route error:", error);
        res.status(500).json({ success: false, message: "Failed to get document" });
    }
});
router.delete("/assessment/documents/:documentId", async (req, res) => {
    try {
        const { deleteDocument } = await import("../controllers/documentController.js");
        deleteDocument(req, res);
    }
    catch (error) {
        console.error("Delete document route error:", error);
        res.status(500).json({ success: false, message: "Failed to delete document" });
    }
});
export default router;
