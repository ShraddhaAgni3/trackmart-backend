import express from "express";
import {
  createProduct,
  getVendorProducts,
  deleteProduct,
  getProductById,
  getProducts,
  bulkUploadProducts   // ✅ NEW
} from "../controllers/productController.js";

import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import pool from "../config/db.js"; // ✅ FIX (missing import)
import multer from "multer";
const router = express.Router();
const memoryUpload = multer(); 
/* ================= GET ROUTES ================= */

router.get("/", getProducts);

router.get("/vendor", protect, getVendorProducts);

router.get("/:id", getProductById);

/* ================= IMAGE UPLOAD ================= */

router.post(
  "/upload-image",
  protect,
 memoryUpload.single("file"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      return res.status(200).json({
        url: req.file.path   // 👈 Cloudinary / local path
      });

    } catch (err) {
      console.log("UPLOAD ERROR:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

/* ================= CREATE PRODUCT ================= */

router.post("/", protect, createProduct);

/* ================= 🔥 BULK UPLOAD ================= */

router.post(
  "/bulk-upload",
  protect,
  upload.single("file"),   // 👈 Excel file
  bulkUploadProducts
);

/* ================= UPDATE PRODUCT ================= */

router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      stock,
      size
    } = req.body;

    await pool.query(
      `UPDATE products 
       SET title=$1, description=$2, price=$3, stock=$4, size=$5
       WHERE id=$6`,
      [title, description, price, stock, size, id]
    );

    res.json({ message: "Product updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= DELETE PRODUCT ================= */

router.delete("/:id", protect, deleteProduct);

export default router;
