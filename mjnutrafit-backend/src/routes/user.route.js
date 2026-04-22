const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { 
  register, 
  login, 
  currentUser, 
  updateProfile, 
  changePassword,
  uploadProfilePicture,
  upload
} = require("../controllers/user.controller");
const { getMyProfile, submitProfile } = require("../controllers/client-profile.controller");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/currentUser", authMiddleware, currentUser);
router.put("/profile", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.post("/upload-picture", authMiddleware, upload.single("profilePicture"), uploadProfilePicture);

router.get("/client-profile", authMiddleware, getMyProfile);
router.post("/client-profile", authMiddleware, submitProfile);

module.exports = router;
