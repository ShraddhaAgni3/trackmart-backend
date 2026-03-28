import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

export default router;
