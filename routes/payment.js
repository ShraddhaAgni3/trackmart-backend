import express from "express";
import {
  createOrder,
  verifyPayment,
  createVendorOrder,
  verifyVendorPayment
} from "../controllers/paymentController.js";

const router = express.Router();

/* ================= CUSTOMER ================= */

router.post("/create-order", createOrder);   // unchanged
router.post("/verify", verifyPayment);       // unchanged


/* ================= VENDOR ================= */

router.post("/create-vendor-order", createVendorOrder);
router.post("/verify-vendor", verifyVendorPayment);

export default router;
