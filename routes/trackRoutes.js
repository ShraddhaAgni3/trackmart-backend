import express from "express";
import { getItemTracking, updateLocation } from "../controllers/trackController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// 🔥 COMMON ROUTE FOR ALL
router.get("/:itemId", protect, getItemTracking);


router.patch("/update-location", updateLocation);

export default router;
