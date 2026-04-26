import express from "express";
import {
  createProduct,
  getVendorProducts,
  deleteProduct,
  getProductById,
  getProducts
} from "../controllers/productController.js";

import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/* GET ALL PRODUCTS */
router.get("/", getProducts);

router.get("/vendor", protect, getVendorProducts);

router.get("/:id", getProductById);

/* 🔥 IMAGE UPLOAD (NEW) */
router.post("/upload-image", protect, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    return res.status(200).json({   url: req.file.path });

  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ✅ CREATE (LIGHTWEIGHT NOW) */
router.post(
  "/",
  protect,
  createProduct
);

/* DELETE */
router.delete("/:id", protect, deleteProduct);

export default router;
