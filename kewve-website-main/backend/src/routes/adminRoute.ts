import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Assessment } from "../models/Assessment.js";
import { Product } from "../models/Product.js";

const router = Router();

// POST /api/admin/login - Admin login using .env credentials
router.post("/admin/login", (req: Request, res: Response): void => {
  const { email, password } = req.body;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    res.status(500).json({ success: false, message: "Admin credentials not configured" });
    return;
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    res.status(401).json({ success: false, message: "Invalid admin credentials" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ success: false, message: "JWT_SECRET not set" });
    return;
  }

  const token = jwt.sign({ adminEmail: ADMIN_EMAIL, role: "admin" }, secret, { expiresIn: "30d" });

  res.json({
    success: true,
    message: "Admin login successful",
    data: {
      user: {
        id: "admin",
        email: ADMIN_EMAIL,
        name: "Admin",
        role: "admin",
      },
      token,
    },
  });
});

// Admin auth middleware that also accepts admin JWT tokens
export const authenticateAdmin = async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
  try {
    const tokenStr = req.headers.authorization?.replace("Bearer ", "");
    if (!tokenStr) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) { res.status(500).json({ success: false, message: "JWT_SECRET not set" }); return; }

    const decoded = jwt.verify(tokenStr, secret) as any;

    // Admin token (from admin login)
    if (decoded.role === "admin" && decoded.adminEmail) {
      (req as any).user = { role: "admin", email: decoded.adminEmail, name: "Admin" };
      next();
      return;
    }

    // Regular user token - check if they're an admin in DB
    if (decoded.userId) {
      const user = await User.findById(decoded.userId);
      if (user && user.role === "admin") {
        req.user = user;
        next();
        return;
      }
    }

    res.status(403).json({ success: false, message: "Admin access required" });
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// GET /api/admin/me - Get admin user info
router.get("/admin/me", authenticateAdmin, (req: AuthRequest, res: Response): void => {
  const user = (req as any).user;
  res.json({
    success: true,
    data: {
      user: {
        id: "admin",
        email: user.email,
        name: user.name || "Admin",
        role: "admin",
      },
    },
  });
});

// GET /api/admin/producers
router.get("/admin/producers", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const producers = await User.find({ role: { $ne: "admin" } }).select("-password").sort({ createdAt: -1 });

    const producerData = await Promise.all(
      producers.map(async (user) => {
        const assessment = await Assessment.findOne({ userId: user._id }).select("-documents.data");
        const productCount = await Product.countDocuments({ userId: user._id });

        let readinessStatus = "not_started";
        if (assessment) {
          const hasAnswers = assessment.get("country") || assessment.get("businessRegistered") || assessment.get("haccpProcess");
          if (hasAnswers) readinessStatus = "in_progress";
          if (assessment.get("confirmAccuracy") === "yes" && assessment.get("agreeCompliance") === "yes") readinessStatus = "completed";
        }

        let verificationStatus = "pending";
        if (assessment && (assessment as any).verified) {
          verificationStatus = "verified";
        } else if (assessment && assessment.documents && assessment.documents.length > 0) {
          const allApproved = assessment.documents.every((d: any) => d.status === "approved");
          const someApproved = assessment.documents.some((d: any) => d.status === "approved");
          const someRejected = assessment.documents.some((d: any) => d.status === "rejected");
          if (allApproved) verificationStatus = "all_approved";
          else if (someRejected) verificationStatus = "action_needed";
          else if (someApproved) verificationStatus = "in_review";
          else verificationStatus = "submitted";
        }

        return {
          id: user._id,
          name: user.name,
          businessName: user.businessName || "-",
          country: user.country || "-",
          email: user.email,
          readiness: readinessStatus,
          verification: verificationStatus,
          products: productCount,
          createdAt: user.createdAt,
        };
      })
    );

    res.status(200).json({ success: true, data: producerData });
  } catch (error) {
    console.error("Admin producers error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch producers" });
  }
});

// GET /api/admin/stats
router.get("/admin/stats", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalProducers = await User.countDocuments({ role: { $ne: "admin" } });
    const verifiedProducers = await Assessment.countDocuments({ verified: true });
    const totalProducts = await Product.countDocuments({});
    const totalAssessments = await Assessment.countDocuments({});

    // Count documents pending review across all assessments
    const assessments = await Assessment.find({}).select("documents");
    let pendingDocs = 0;
    let totalDocs = 0;
    let approvedDocs = 0;
    let rejectedDocs = 0;
    assessments.forEach((a) => {
      if (a.documents) {
        a.documents.forEach((d: any) => {
          totalDocs++;
          if (d.status === "pending") pendingDocs++;
          else if (d.status === "approved") approvedDocs++;
          else if (d.status === "rejected") rejectedDocs++;
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalProducers,
        verifiedProducers,
        totalProducts,
        totalAssessments,
        pendingDocs,
        totalDocs,
        approvedDocs,
        rejectedDocs,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

// GET /api/admin/producer/:id
router.get("/admin/producer/:id", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "Producer not found" });
      return;
    }

    const assessment = await Assessment.findOne({ userId: user._id }).select("-documents.data");
    const products = await Product.find({ userId: user._id }).select("-image.data");

    res.status(200).json({
      success: true,
      data: { user, assessment, products },
    });
  } catch (error) {
    console.error("Admin producer detail error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch producer" });
  }
});

// GET /api/admin/producer/:id/document/:docId - View/download a producer's document
// Also accepts ?token=... as a query param for opening in new tab
router.get("/admin/producer/:id/document/:docId", async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
  // Allow token from query string for direct browser viewing
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  authenticateAdmin(req, res, next);
}, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assessment = await Assessment.findOne({ userId: req.params.id });
    if (!assessment) {
      res.status(404).json({ success: false, message: "Assessment not found" });
      return;
    }

    const doc = assessment.documents?.find((d: any) => d._id?.toString() === req.params.docId);
    if (!doc) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    res.setHeader("Content-Type", doc.type);
    res.setHeader("Content-Disposition", `inline; filename="${doc.name}"`);
    if (doc.size) res.setHeader("Content-Length", doc.size);
    res.send(doc.data);
  } catch (error) {
    console.error("Admin view document error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch document" });
  }
});

// PUT /api/admin/producer/:id/document/:docId/review - Approve or reject a document
router.put("/admin/producer/:id/document/:docId/review", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, reason } = req.body;
    if (!action || !["approved", "rejected"].includes(action)) {
      res.status(400).json({ success: false, message: "Action must be 'approved' or 'rejected'" });
      return;
    }
    if (action === "rejected" && !reason) {
      res.status(400).json({ success: false, message: "Rejection reason is required" });
      return;
    }

    const assessment = await Assessment.findOne({ userId: req.params.id });
    if (!assessment) {
      res.status(404).json({ success: false, message: "Assessment not found" });
      return;
    }

    const doc = assessment.documents?.find((d: any) => d._id?.toString() === req.params.docId);
    if (!doc) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    (doc as any).status = action;
    if (action === "rejected") {
      (doc as any).rejectionReason = reason;
    } else {
      (doc as any).rejectionReason = undefined;
    }
    (doc as any).reviewedAt = new Date();

    await assessment.save();

    res.status(200).json({
      success: true,
      message: `Document ${action}`,
      data: {
        documentId: req.params.docId,
        status: action,
        reason: action === "rejected" ? reason : undefined,
      },
    });
  } catch (error) {
    console.error("Admin review document error:", error);
    res.status(500).json({ success: false, message: "Failed to review document" });
  }
});

// PUT /api/admin/producer/:id/verify - Mark producer as verified (all docs must be approved)
router.put("/admin/producer/:id/verify", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: "Producer not found" });
      return;
    }

    const assessment = await Assessment.findOne({ userId: user._id });
    if (!assessment || !assessment.documents || assessment.documents.length === 0) {
      res.status(400).json({ success: false, message: "No documents found for this producer" });
      return;
    }

    const allApproved = assessment.documents.every((d: any) => d.status === "approved");
    if (!allApproved) {
      res.status(400).json({ success: false, message: "All documents must be approved before verifying a producer" });
      return;
    }

    // Set a verified flag on the assessment
    (assessment as any).verified = true;
    (assessment as any).verifiedAt = new Date();
    (assessment as any).verifiedBy = (req as any).user.email;
    await assessment.save();

    res.status(200).json({
      success: true,
      message: "Producer marked as verified",
    });
  } catch (error) {
    console.error("Admin verify producer error:", error);
    res.status(500).json({ success: false, message: "Failed to verify producer" });
  }
});

// ─── Product Review Endpoints ───────────────────────────────────────────────

// GET /api/admin/products - List all products across all producers
router.get("/admin/products", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const products = await Product.find({}).select("-image").sort({ createdAt: -1 }).lean();

    // Get producer info for each product
    const userIds = Array.from(new Set(products.map((p: any) => p.userId.toString())));
    const users = await User.find({ _id: { $in: userIds } }).select("name email businessName").lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    // Check which products have images
    const productIds = products.map((p: any) => p._id);
    const withImages = await Product.find(
      { _id: { $in: productIds }, "image.contentType": { $exists: true, $ne: null } }
    ).select("_id").lean();
    const imageSet = new Set(withImages.map((p: any) => p._id.toString()));

    const data = products.map((p: any) => {
      const producer = userMap.get(p.userId.toString());
      return {
        ...p,
        hasImage: imageSet.has(p._id.toString()),
        producer: producer
          ? { name: producer.name, email: producer.email, businessName: producer.businessName }
          : null,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Admin products error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

// GET /api/admin/products/:id - Get full product detail
router.get("/admin/products/:id", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).select("-image").lean();
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const producer = await User.findById((product as any).userId).select("name email businessName country").lean();

    // Check if has image
    const hasImage = await Product.exists({
      _id: req.params.id,
      "image.contentType": { $exists: true, $ne: null },
    });

    res.status(200).json({
      success: true,
      data: {
        ...(product as any),
        hasImage: !!hasImage,
        producer: producer || null,
      },
    });
  } catch (error) {
    console.error("Admin product detail error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

// GET /api/admin/products/:id/image - Serve product image to admin
router.get("/admin/products/:id/image", async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  authenticateAdmin(req, res, next);
}, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.image || !product.image.data) {
      res.status(404).json({ success: false, message: "Image not found" });
      return;
    }
    res.set("Content-Type", product.image.contentType);
    res.set("Cache-Control", "private, max-age=3600");
    res.send(product.image.data);
  } catch (error) {
    console.error("Admin product image error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch image" });
  }
});

// PUT /api/admin/products/:id/review - Approve or reject a product
router.put("/admin/products/:id/review", authenticateAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, reason } = req.body;
    if (!action || !["approved", "rejected"].includes(action)) {
      res.status(400).json({ success: false, message: "Action must be 'approved' or 'rejected'" });
      return;
    }
    if (action === "rejected" && !reason) {
      res.status(400).json({ success: false, message: "Rejection reason is required" });
      return;
    }

    const update: any = {
      verification: action === "approved" ? "verified" : "rejected",
    };
    if (action === "approved") {
      update.readiness = "approved";
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true }).select("-image");
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Product ${action}`,
      data: product,
    });
  } catch (error) {
    console.error("Admin review product error:", error);
    res.status(500).json({ success: false, message: "Failed to review product" });
  }
});

export default router;
