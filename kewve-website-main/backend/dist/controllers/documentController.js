import { Assessment } from "../models/Assessment.js";
export const uploadDocument = async (req, res) => {
    try {
        const userId = req.user._id;
        const file = req.file;
        console.log("Upload document - file received:", file ? { name: file.originalname, size: file.size, type: file.mimetype } : "null");
        if (!file) {
            res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
            return;
        }
        if (!file.buffer) {
            res.status(400).json({
                success: false,
                message: "File buffer is missing",
            });
            return;
        }
        // Get or create assessment
        let assessment = await Assessment.findOne({ userId });
        if (!assessment) {
            assessment = await Assessment.create({ userId });
        }
        // Store file data in database as Buffer
        const document = {
            name: file.originalname,
            type: file.mimetype,
            data: Buffer.from(file.buffer), // Ensure it's a proper Buffer
            size: file.size,
            uploadedAt: new Date(),
        };
        assessment.documents = assessment.documents || [];
        assessment.documents.push(document);
        console.log("Saving assessment with document...");
        await assessment.save();
        console.log("Assessment saved successfully");
        // Reload assessment to get the document with _id
        const updatedAssessment = await Assessment.findById(assessment._id);
        if (!updatedAssessment || !updatedAssessment.documents || updatedAssessment.documents.length === 0) {
            throw new Error("Failed to retrieve saved document");
        }
        const savedDoc = updatedAssessment.documents[updatedAssessment.documents.length - 1];
        const docId = savedDoc._id?.toString() || savedDoc._id;
        res.status(200).json({
            success: true,
            message: "Document uploaded successfully",
            data: {
                document: {
                    _id: docId,
                    name: document.name,
                    type: document.type,
                    size: document.size,
                    uploadedAt: document.uploadedAt,
                },
            },
        });
    }
    catch (error) {
        console.error("Document upload error:", error);
        console.error("Error stack:", error?.stack);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error?.message || "Failed to upload document",
            });
        }
    }
};
export const deleteDocument = async (req, res) => {
    try {
        const userId = req.user._id;
        const { documentId } = req.params;
        const assessment = await Assessment.findOne({ userId });
        if (!assessment) {
            res.status(404).json({
                success: false,
                message: "Assessment not found",
            });
            return;
        }
        // Find and remove document
        const document = assessment.documents?.find((doc) => doc._id?.toString() === documentId);
        if (!document) {
            res.status(404).json({
                success: false,
                message: "Document not found",
            });
            return;
        }
        // Remove from assessment (file data is in database, no filesystem cleanup needed)
        assessment.documents = assessment.documents?.filter((doc) => doc._id?.toString() !== documentId);
        await assessment.save();
        res.status(200).json({
            success: true,
            message: "Document deleted successfully",
        });
    }
    catch (error) {
        console.error("Document delete error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete document",
        });
    }
};
export const getDocument = async (req, res) => {
    try {
        const userId = req.user._id;
        const { documentId } = req.params;
        const assessment = await Assessment.findOne({ userId });
        if (!assessment) {
            res.status(404).json({
                success: false,
                message: "Assessment not found",
            });
            return;
        }
        // Find document
        const document = assessment.documents?.find((doc) => doc._id?.toString() === documentId);
        if (!document) {
            res.status(404).json({
                success: false,
                message: "Document not found",
            });
            return;
        }
        // Set appropriate headers and send file data
        res.setHeader("Content-Type", document.type);
        res.setHeader("Content-Disposition", `inline; filename="${document.name}"`);
        res.setHeader("Content-Length", document.size);
        res.send(document.data);
    }
    catch (error) {
        console.error("Get document error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get document",
        });
    }
};
