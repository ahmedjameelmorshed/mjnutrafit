const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const {
  getPendingClients,
  approveClient,
  rejectClient,
  getAssignedClients,
  getMyClients,
  reviewProgressLog,
  getCoachAdherenceOverview,
} = require("../controllers/coach.controller");

const router = express.Router();

router.get("/pending-clients", authMiddleware, getPendingClients);
router.post("/approve-client/:clientId", authMiddleware, approveClient);
router.post("/reject-client/:clientId", authMiddleware, rejectClient);
router.get("/assigned-clients", authMiddleware, getAssignedClients);
router.get("/my-clients", authMiddleware, getMyClients);
router.get("/adherence-overview", authMiddleware, getCoachAdherenceOverview);
router.post("/review-log/:logId", authMiddleware, reviewProgressLog);

module.exports = router;
