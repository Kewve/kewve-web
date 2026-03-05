import { Router, Request, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { Product } from "../models/Product.js";

const router = Router();

// Middleware to support auth token via query parameter (for img src tags)
const tokenFromQuery = (req: Request, _res: Response, next: NextFunction) => {
  const queryToken = req.query.token as string | undefined;
  if (queryToken && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  next();
};

// GET /api/products - List all products for current user
router.get("/products", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const products = await Product.find({ userId }).select("-image").sort({ createdAt: -1 });

    // Check which products have images with a separate lightweight query
    const productIds = products.map((p) => p._id);
    const withImages = await Product.find(
      { _id: { $in: productIds }, "image.contentType": { $exists: true, $ne: null } }
    ).select("_id").lean();
    const imageSet = new Set(withImages.map((p) => p._id.toString()));

    const data = products.map((p) => ({
      ...p.toObject(),
      hasImage: imageSet.has(p._id.toString()),
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch products",
    });
  }
});

// GET /api/products/:id - Get a single product
router.get("/products/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const product = await Product.findOne({ _id: req.params.id, userId }).select("-image");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error: any) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch product",
    });
  }
});

// GET /api/products/:id/image - Get product image
router.get("/products/:id/image", tokenFromQuery, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const product = await Product.findOne({ _id: req.params.id, userId });

    if (!product || !product.image || !product.image.data) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    res.set("Content-Type", product.image.contentType);
    res.set("Cache-Control", "private, max-age=3600");
    res.send(product.image.data);
  } catch (error: any) {
    console.error("Get product image error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch image",
    });
  }
});

// POST /api/products - Create a new product
router.post("/products", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const {
      name, category, description, hsCode,
      minimumOrderQuantity, unitPrice, leadTime, monthlyCapacity,
    } = req.body;

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

    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create product",
    });
  }
});

// PUT /api/products/:id - Update a product
router.put("/products/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const {
      name, category, description, hsCode,
      minimumOrderQuantity, unitPrice, leadTime, monthlyCapacity,
    } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId },
      {
        name,
        category,
        description,
        hsCode,
        minimumOrderQuantity: Number(minimumOrderQuantity) || 0,
        unitPrice: Number(unitPrice) || 0,
        leadTime: Number(leadTime) || 0,
        monthlyCapacity: Number(monthlyCapacity) || 0,
      },
      { new: true, runValidators: true }
    ).select("-image");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error: any) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update product",
    });
  }
});

// POST /api/products/:id/image - Upload product image
router.post("/products/:id/image", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const multerModule = await import("multer");
    const multer = multerModule.default;

    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
        }
      },
    });

    const singleUpload = upload.single("image");
    singleUpload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const userId = req.user!._id;
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ success: false, message: "No image file provided" });
      }

      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, userId },
        {
          image: {
            data: file.buffer,
            contentType: file.mimetype,
          },
        },
        { new: true }
      ).select("-image");

      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      res.json({ success: true, data: { message: "Image uploaded successfully" } });
    });
  } catch (error: any) {
    console.error("Upload product image error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image",
      });
    }
  }
});

// DELETE /api/products/:id - Delete a product
router.delete("/products/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: { message: "Product deleted" } });
  } catch (error: any) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete product",
    });
  }
});

export default router;
