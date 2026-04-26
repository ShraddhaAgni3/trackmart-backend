import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// 🔥 Optimized storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "trackmart_products",

      // 🔥 auto optimize
      format: "webp", // convert to webp (smaller size)

      transformation: [
        {
          width: 800,
          height: 800,
          crop: "limit",     // don't upscale
          quality: "auto",   // auto compression
          fetch_format: "auto"
        }
      ],

      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`
    };
  }
});

// 🔥 Add limits (VERY IMPORTANT)
export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP allowed"), false);
    }
  }
});
