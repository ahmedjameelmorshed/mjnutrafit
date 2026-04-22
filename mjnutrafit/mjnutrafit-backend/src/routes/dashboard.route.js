const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { getClientDashboard, getCoachDashboard } = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/client", authMiddleware, getClientDashboard);
router.get("/coach", authMiddleware, getCoachDashboard);

module.exports = router;
