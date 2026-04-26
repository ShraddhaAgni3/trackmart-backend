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
router.post(
  "/upload-image",
  protect,
  upload.single("image"),
  (req, res) => {
    res.json({ url: req.file.path });
  }
);

/* ✅ CREATE (LIGHTWEIGHT NOW) */
router.post(
  "/",
  protect,
  createProduct
);

/* DELETE */
router.delete("/:id", protect, deleteProduct);

export default router;
