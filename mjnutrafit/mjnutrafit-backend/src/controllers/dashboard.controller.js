const User = require("../models/user.model");
const Plan = require("../models/plan.model");
const ProgressLog = require("../models/progress-log.model");
const Feedback = require("../models/feedback.model");
const ClientProfile = require("../models/client-profile.model");
const { sequelize } = require("../config/database/sequelize.config");

const getClientDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== "client") {
      res.status(403).json({ message: "Only clients can access client dashboard" });
      return;
    }

    const latestLog = await ProgressLog.findOne({
      where: { clientId: req.user.id },
      order: [["weekStartDate", "DESC"]],
      attributes: ["weight", "status", "weekStartDate"],
    });

    const lastSubmission = latestLog
      ? {
          status: latestLog.status,
          logDate: latestLog.weekStartDate,
          weekStartDate: latestLog.weekStartDate,
          weight: latestLog.weight,
        }
      : null;

    const weightTrend = await ProgressLog.findAll({
      where: { clientId: req.user.id },
      attributes: ["weekStartDate", "weight", "mealAdherence", "workoutCompletion"],
      order: [["weekStartDate", "ASC"]],
      limit: 10,
    });

    const currentPlan = await Plan.findOne({
      where: { clientId: req.user.id, isActive: true },
      attributes: ["id", "dietText", "workoutText", "createdAt"],
    });

    let assignedCoach = null;
    if (req.user.status === "pending" && req.user.assignedCoachId) {
      const coach = await User.findByPk(req.user.assignedCoachId, {
        attributes: ["firstName", "lastName"],
      });
      if (coach) {
        assignedCoach = { firstName: coach.firstName, lastName: coach.lastName };
      }
    }

    const clientProfile = await ClientProfile.findOne({
      where: { userId: req.user.id },
    });
    const hasCompletedOnboarding = !!clientProfile;

    res.status(200).json({
      latestWeight: latestLog?.weight || null,
      lastSubmission,
      weightTrend,
      currentPlan,
      assignedCoach,
      hasCompletedOnboarding,
      clientProfile: clientProfile ? clientProfile.toJSON() : null,
    });
  } catch (error) {
    next(error);
  }
};

const getCoachDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can access coach dashboard" });
      return;
    }

    const clients = await sequelize.query(
      `SELECT 
        u.id,
        u."firstName" as "first_name",
        u."lastName" as "last_name",
        u.email,
        u.status,
        COUNT(DISTINCT CASE WHEN (TRIM(COALESCE(p."dietText", '')) != '' OR TRIM(COALESCE(p."workoutText", '')) != '') THEN p.id END) as "planCount",
        COUNT(DISTINCT pl.id) as "logCount",
        COALESCE(AVG(pl."mealAdherence"), 0) as "avgMealAdherence",
        COALESCE(AVG(pl."workoutCompletion"), 0) as "avgWorkoutCompletion",
        MAX(pl.weight) as "maxWeight",
        MIN(pl.weight) as "minWeight",
        MAX(pl."weekStartDate") as "lastLogDate"
       FROM users u
       LEFT JOIN plans p ON p."clientId" = u.id AND p."coachId" = :coachId
       LEFT JOIN "progress_logs" pl ON pl."clientId" = u.id
       WHERE u.role = 'client'
         AND u.status = 'active'
         AND u."assignedCoachId" = :coachId
       GROUP BY u.id, u."firstName", u."lastName", u.email, u.status, u."createdAt"
       ORDER BY u."createdAt" DESC`,
      {
        replacements: { coachId: req.user.id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (clients && clients.length > 0) {
      for (const client of clients) {
        const profile = await ClientProfile.findOne({
          where: { userId: client.id },
        });
        client.profile = profile ? profile.toJSON() : null;
        const latestLog = await ProgressLog.findOne({
          where: { clientId: client.id },
          order: [["weekStartDate", "DESC"]],
          attributes: ["progressPercentage", "weekStartDate", "weight", "status"],
        });
        client.latestProgress = latestLog
          ? {
              progressPercentage: latestLog.progressPercentage,
              weekStartDate: latestLog.weekStartDate,
              weight: latestLog.weight,
              status: latestLog.status,
            }
          : null;
      }
    }

    const weightTrends = {};
    if (clients && clients.length > 0) {
      for (const client of clients) {
        try {
          const trends = await sequelize.query(
            `SELECT "weekStartDate" as week_start_date, weight, "mealAdherence" as meal_adherence, "workoutCompletion" as workout_completion
             FROM "progress_logs"
             WHERE "clientId" = :clientId
             ORDER BY "weekStartDate" DESC
             LIMIT 5`,
            {
              replacements: { clientId: client.id },
              type: sequelize.QueryTypes.SELECT,
            }
          );
          weightTrends[client.id] = trends ? trends.reverse() : [];
        } catch (err) {
          weightTrends[client.id] = [];
        }
      }
    }

    const pendingLogsResult = await sequelize.query(
      `SELECT COUNT(*)::int as count
       FROM "progress_logs" pl
       INNER JOIN users u ON u.id = pl."clientId"
       WHERE u."assignedCoachId" = :coachId AND pl.status = 'submitted'`,
      {
        replacements: { coachId: req.user.id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      clients: clients || [],
      weightTrends,
      pendingLogsCount: pendingLogsResult && pendingLogsResult.length > 0 ? parseInt(pendingLogsResult[0].count || 0) : 0,
    });
  } catch (error) {
    console.error("Coach dashboard error:", error);
    next(error);
  }
};

module.exports = {
  getClientDashboard,
  getCoachDashboard,
};
