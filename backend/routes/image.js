const express = require("express");
const multer = require("multer");
const { diagnoseImage } = require("../services/vision");
const { verifyToken, requireFarmerAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB upload limit
});

// POST /api/image/diagnose (Secured S-2)
router.post("/diagnose", verifyToken, requireFarmerAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "image_required" });

  try {
    const diag = await diagnoseImage(req.file.buffer);
    return res.json({
      ok: true,
      diagnosis: diag,
    });
  } catch (err) {
    console.error("Vision diagnosis error:", err);
    return res.status(500).json({ error: "vision_failed" });
  }
});

module.exports = router;
