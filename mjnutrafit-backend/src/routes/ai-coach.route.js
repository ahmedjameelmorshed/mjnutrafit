const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { aiCoachChat } = require("../controllers/ai-coach.controller");

const router = express.Router();

router.post("/chat", authMiddleware, aiCoachChat);

module.exports = router;
