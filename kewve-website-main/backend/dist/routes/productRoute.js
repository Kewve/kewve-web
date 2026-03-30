import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { shouldUseBuyerProductCatalog, userHasRole } from "../utils/userRoles.js";
import { Product } from "../models/Product.js";
import { stripComplianceDocumentsForClient, syncProductComplianceStatus, } from "../utils/productCompliance.js";
const router = Router();
const MAX_COMPLIANCE_DOCS = 30;
const ALLOWED_COMPLIANCE_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
function productToClientJson(product) {
    const obj = typeof product?.toObject === "function" ? product.toObject() : { ...product };
    if (obj.complianceDocuments?.length) {
        obj.complianceDocuments = stripComplianceDocumentsForClient(obj.complianceDocuments);
    }
    return obj;
}
// Middleware to support auth token via query parameter (for img src tags)
const tokenFromQuery = (req, _res, next) => {
    const queryToken = req.query.token;
    if (queryToken && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${queryToken}`;
    }
    next();
};
const validateProductPayload = (payload) => {
    const name = String(payload?.name || "").trim();
    const category = String(payload?.category || "").trim();
    const description = String(payload?.description || "").trim();
    const minimumOrderQuantity = Number(payload?.minimumOrderQuantity || 0);
    const unitPrice = Number(payload?.unitPrice || 0);
    const leadTime = Number(payload?.leadTime || 0);
    const monthlyCapacity = Number(payload?.monthlyCapacity || 0);
    if (!name)
        return "Product name is required.";
    if (!category)
        return "Product category is required.";
    if (!description)
        return "Product description is required.";
    if (!Number.isFinite(minimumOrderQuantity) || minimumOrderQuantity <= 0) {
        return "Minimum order quantity must be greater than zero.";
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return "Unit price must be greater than zero.";
    }
    if (!Number.isFinite(leadTime) || leadTime <= 0) {
        return "Lead time must be greater than zero.";
    }
    if (!Number.isFinite(monthlyCapacity) || monthlyCapacity <= 0) {
        return "Monthly capacity must be greater than zero.";
    }
    return null;
};
// GET /api/products - List all products for current user
router.get("/products", authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const isBuyer = shouldUseBuyerProductCatalog(req.user, req.query);
        const products = isBuyer
            ? await Product.find({ readiness: "approved", verification: "verified" })
                .select("-image")
                .sort({ createdAt: -1 })
            : await Product.find({ userId }).select("-image").sort({ createdAt: -1 });
        // Check which products have images with a separate lightweight query
        const productIds = products.map((p) => p._id);
        const withImages = await Product.find({ _id: { $in: productIds }, "image.contentType": { $exists: true, $ne: null } }).select("_id").lean();
        const imageSet = new Set(withImages.map((p) => p._id.toString()));
        const data = products.map((p) => {
            const o = productToClientJson(p);
            return {
                ...o,
                hasImage: imageSet.has(p._id.toString()),
            };
        });
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch products",
        });
    }
});
// GET /api/products/:id - Get a single product
router.get("/products/:id", authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const isBuyer = shouldUseBuyerProductCatalog(req.user, req.query);
        const product = isBuyer
            ? await Product.findOne({
                _id: req.params.id,
                readiness: "approved",
                verification: "verified",
            }).select("-image")
            : await Product.findOne({ _id: req.params.id, userId }).select("-image");
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.json({ success: true, data: product });
    }
    catch (error) {
        console.error("Get product error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch product",
        });
    }
});
// GET /api/products/:id/image - Get product image
router.get("/products/:id/image", tokenFromQuery, authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const isBuyer = shouldUseBuyerProductCatalog(req.user, req.query);
        const product = isBuyer
            ? await Product.findOne({
                _id: req.params.id,
                readiness: "approved",
                verification: "verified",
            })
            : await Product.findOne({ _id: req.params.id, userId });
        if (!product || !product.image || !product.image.data) {
            return res.status(404).json({ success: false, message: "Image not found" });
        }
        res.set("Content-Type", product.image.contentType);
        res.set("Cache-Control", "private, max-age=3600");
        res.send(product.image.data);
    }
    catch (error) {
        console.error("Get product image error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch image",
        });
    }
});
// POST /api/products - Create a new product
router.post("/products", authenticate, async (req, res) => {
    try {
        if (!userHasRole(req.user, "producer")) {
            return res.status(403).json({ success: false, message: "Producer access required to create products." });
        }
        const userId = req.user._id;
        const contentType = String(req.headers["content-type"] || "").toLowerCase();
        // Multipart flow: create product + optional compliance documents in one request.
        if (contentType.includes("multipart/form-data")) {
            const multerModule = await import("multer");
            const multer = multerModule.default;
            const upload = multer({
                storage: multer.memoryStorage(),
                limits: { fileSize: 10 * 1024 * 1024, files: MAX_COMPLIANCE_DOCS },
                fileFilter: (_req, file, cb) => {
                    if (ALLOWED_COMPLIANCE_TYPES.includes(file.mimetype))
                        cb(null, true);
                    else
                        cb(new Error("Only PDF, images, and Word documents are allowed."));
                },
            });
            const fieldsUpload = upload.fields([
                { name: "documents", maxCount: MAX_COMPLIANCE_DOCS },
                { name: "documents[]", maxCount: MAX_COMPLIANCE_DOCS },
                { name: "document", maxCount: MAX_COMPLIANCE_DOCS },
            ]);
            fieldsUpload(req, res, async (err) => {
                if (err) {
                    return res.status(400).json({ success: false, message: err.message });
                }
                const body = req.body || {};
                const validationError = validateProductPayload(body);
                if (validationError) {
                    return res.status(400).json({ success: false, message: validationError });
                }
                const filesMap = (req.files || {});
                const files = [
                    ...(Array.isArray(filesMap["documents"]) ? filesMap["documents"] : []),
                    ...(Array.isArray(filesMap["documents[]"]) ? filesMap["documents[]"] : []),
                    ...(Array.isArray(filesMap["document"]) ? filesMap["document"] : []),
                ];
                const product = await Product.create({
                    userId,
                    name: body.name,
                    category: body.category,
                    description: body.description,
                    hsCode: body.hsCode,
                    minimumOrderQuantity: Number(body.minimumOrderQuantity) || 0,
                    unitPrice: Number(body.unitPrice) || 0,
                    leadTime: Number(body.leadTime) || 0,
                    monthlyCapacity: Number(body.monthlyCapacity) || 0,
                });
                if (files.length > 0) {
                    product.complianceDocuments = files.map((file) => ({
                        name: file.originalname || "document",
                        type: file.mimetype,
                        data: file.buffer,
                        size: file.size,
                        status: "pending",
                        uploadedAt: new Date(),
                    }));
                    syncProductComplianceStatus(product);
                    await product.save();
                }
                return res.status(201).json({ success: true, data: productToClientJson(product) });
            });
            return;
        }
        // JSON flow: legacy create without files.
        const { name, category, description, hsCode, minimumOrderQuantity, unitPrice, leadTime, monthlyCapacity } = req.body;
        const validationError = validateProductPayload(req.body);
        if (validationError)
            return res.status(400).json({ success: false, message: validationError });
        const product = await Product.create({
            userId,
            name,
            category,
            description,
            hsCode,
            minimumOrderQuantity: Number(minimumOrderQuantity) || 0,
            unitPrice: Number(unitPrice) || 0,
            leadTime: Number(leadTime) || 0,
            monthlyCapacity: Number(monthlyCapacity) || 0,
        });
        return res.status(201).json({ success: true, data: productToClientJson(product) });
    }
    catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create product",
        });
    }
});
// PUT /api/products/:id - Update a product
router.put("/products/:id", authenticate, async (req, res) => {
    try {
        if (!userHasRole(req.user, "producer")) {
            return res.status(403).json({ success: false, message: "Producer access required to update products." });
        }
        const userId = req.user._id;
        const { name, category, description, hsCode, minimumOrderQuantity, unitPrice, leadTime, monthlyCapacity, } = req.body;
        const validationError = validateProductPayload(req.body);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }
        const existing = await Product.findOne({ _id: req.params.id, userId }).select("-image");
        if (!existing) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const updatePayload = {
            name,
            category,
            description,
            hsCode,
            minimumOrderQuantity: Number(minimumOrderQuantity) || 0,
            unitPrice: Number(unitPrice) || 0,
            leadTime: Number(leadTime) || 0,
            monthlyCapacity: Number(monthlyCapacity) || 0,
        };
        // If previously rejected, a producer edit acts as a resubmission for admin review.
        if (existing.verification === "rejected") {
            updatePayload.verification = "pending";
            updatePayload.readiness = "pending";
            updatePayload.rejectionReason = "";
        }
        const product = await Product.findOneAndUpdate({ _id: req.params.id, userId }, updatePayload, { new: true, runValidators: true }).select("-image");
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        syncProductComplianceStatus(product);
        await product.save();
        res.json({ success: true, data: productToClientJson(product) });
    }
    catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update product",
        });
    }
});
// POST /api/products/:id/image - Upload product image
router.post("/products/:id/image", authenticate, async (req, res) => {
    try {
        if (!userHasRole(req.user, "producer")) {
            return res.status(403).json({ success: false, message: "Producer access required to upload product images." });
        }
        const multerModule = await import("multer");
        const multer = multerModule.default;
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
            fileFilter: (_req, file, cb) => {
                const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                }
                else {
                    cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
                }
            },
        });
        const singleUpload = upload.single("image");
        singleUpload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            const userId = req.user._id;
            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: "No image file provided" });
            }
            const product = await Product.findOneAndUpdate({ _id: req.params.id, userId }, {
                image: {
                    data: file.buffer,
                    contentType: file.mimetype,
                },
            }, { new: true }).select("-image");
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
            res.json({ success: true, data: { message: "Image uploaded successfully" } });
        });
    }
    catch (error) {
        console.error("Upload product image error:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error.message || "Failed to upload image",
            });
        }
    }
});
// POST /api/products/:id/compliance-documents - Upload compliance document (producer)
router.post("/products/:id/compliance-documents", authenticate, async (req, res) => {
    try {
        if (!userHasRole(req.user, "producer")) {
            return res.status(403).json({ success: false, message: "Producer access required." });
        }
        const multerModule = await import("multer");
        const multer = multerModule.default;
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                if (ALLOWED_COMPLIANCE_TYPES.includes(file.mimetype)) {
                    cb(null, true);
                }
                else {
                    cb(new Error("Only PDF, images, and Word documents are allowed."));
                }
            },
        });
        const fieldsUpload = upload.fields([
            { name: "document", maxCount: MAX_COMPLIANCE_DOCS },
            { name: "documents", maxCount: MAX_COMPLIANCE_DOCS },
            { name: "documents[]", maxCount: MAX_COMPLIANCE_DOCS },
        ]);
        fieldsUpload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            const userId = req.user._id;
            const filesMap = (req.files || {});
            const files = [
                ...(Array.isArray(filesMap["document"]) ? filesMap["document"] : []),
                ...(Array.isArray(filesMap["documents"]) ? filesMap["documents"] : []),
                ...(Array.isArray(filesMap["documents[]"]) ? filesMap["documents[]"] : []),
            ];
            if (!files.length) {
                return res.status(400).json({ success: false, message: "No file provided" });
            }
            const product = await Product.findOne({ _id: req.params.id, userId }).select("-image");
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
            const docs = product.complianceDocuments || [];
            if (docs.length + files.length > MAX_COMPLIANCE_DOCS) {
                return res.status(400).json({
                    success: false,
                    message: `Maximum of ${MAX_COMPLIANCE_DOCS} compliance documents per product.`,
                });
            }
            for (const file of files) {
                product.complianceDocuments.push({
                    name: file.originalname || "document",
                    type: file.mimetype,
                    data: file.buffer,
                    size: file.size,
                    status: "pending",
                    uploadedAt: new Date(),
                });
            }
            syncProductComplianceStatus(product);
            await product.save();
            res.json({ success: true, data: productToClientJson(product) });
        });
    }
    catch (error) {
        console.error("Upload compliance document error:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error.message || "Failed to upload document",
            });
        }
    }
});
// GET /api/products/:id/compliance-documents/:docId/file - Download compliance file (producer)
router.get("/products/:id/compliance-documents/:docId/file", tokenFromQuery, authenticate, async (req, res) => {
    try {
        if (!userHasRole(req.user, "producer")) {
            return res.status(403).json({ success: false, message: "Producer access required." });
        }
        const userId = req.user._id;
        const product = await Product.findOne({ _id: req.params.id, userId });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const doc = (product.complianceDocuments || []).find((d) => d._id?.toString() === req.params.docId);
        if (!doc || !doc.data) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }
        res.setHeader("Content-Type", doc.type || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.name)}"`);
        if (doc.size)
            res.setHeader("Content-Length", String(doc.size));
        res.set("Cache-Control", "private, max-age=3600");
        res.send(doc.data);
    }
    catch (error) {
        console.error("Get compliance document error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch document" });
    }
});
// DELETE /api/products/:id/compliance-documents/:docId - Remove compliance document (producer)
router.delete("/products/:id/compliance-documents/:docId", authenticate, async (req, res) => {
    try {
        if (!userHasRole(req.user, "producer")) {
            return res.status(403).json({ success: false, message: "Producer access required." });
        }
        const userId = req.user._id;
        const product = await Product.findOne({ _id: req.params.id, userId }).select("-image");
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const before = (product.complianceDocuments || []).length;
        product.complianceDocuments = (product.complianceDocuments || []).filter((d) => d._id?.toString() !== req.params.docId);
        if ((product.complianceDocuments || []).length === before) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }
        if ((product.complianceDocuments || []).length === 0) {
            product.verification = "pending";
            product.readiness = "draft";
            product.rejectionReason = "";
        }
        else {
            syncProductComplianceStatus(product);
        }
        await product.save();
        res.json({ success: true, data: productToClientJson(product) });
    }
    catch (error) {
        console.error("Delete compliance document error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete document",
        });
    }
});
// DELETE /api/products/:id - Delete a product
router.delete("/products/:id", authenticate, async (req, res) => {
    try {
        if (!userHasRole(req.user, "producer")) {
            return res.status(403).json({ success: false, message: "Producer access required to delete products." });
        }
        const userId = req.user._id;
        const product = await Product.findOneAndDelete({ _id: req.params.id, userId });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.json({ success: true, data: { message: "Product deleted" } });
    }
    catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete product",
        });
    }
});
export default router;
