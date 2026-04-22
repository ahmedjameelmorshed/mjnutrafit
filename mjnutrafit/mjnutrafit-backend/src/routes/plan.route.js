const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { createPlan, getPlans, getCurrentPlan, updatePlan } = require("../controllers/plan.controller");

const router = express.Router();

router.post("/", authMiddleware, createPlan);
router.get("/", authMiddleware, getPlans);
router.get("/current", authMiddleware, getCurrentPlan);
router.put("/:id", authMiddleware, updatePlan);

module.exports = router;
