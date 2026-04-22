const User = require("../models/user.model");
const ProgressLog = require("../models/progress-log.model");
const Feedback = require("../models/feedback.model");
const ClientProfile = require("../models/client-profile.model");
const { ValidationError, Op } = require("sequelize");
const { sequelize } = require("../config/database/sequelize.config");
const { ensureDefaultPlanForCoachClient } = require("../utils/plan-ensure.util");

const getPendingClients = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can view pending clients" });
      return;
    }

    const clients = await User.findAll({
      where: {
        role: "client",
        status: "pending",
        [Op.or]: [
          { assignedCoachId: { [Op.is]: null } },
          { assignedCoachId: req.user.id },
        ],
      },
      attributes: ["id", "firstName", "lastName", "email", "status", "createdAt"],
      include: [
        {
          model: ClientProfile,
          as: "clientProfile",
          required: false,
          attributes: [
            "gender",
            "heightCm",
            "weightKg",
            "goal",
            "targetWeightKg",
            "activityLevel",
            "medicalNotes",
            "dietaryRestrictions",
            "additionalNotes",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const list = clients.map((u) => {
      const uJson = u.toJSON();
      return {
        id: uJson.id,
        first_name: uJson.firstName,
        last_name: uJson.lastName,
        email: uJson.email,
        status: uJson.status,
        created_at: uJson.createdAt,
        profile: uJson.clientProfile || null,
      };
    });

    res.status(200).json(list);
  } catch (error) {
    console.error("Get pending clients error:", error);
    next(error);
  }
};

const approveClient = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can approve clients" });
      return;
    }

    const clientIdNum = parseInt(req.params.clientId, 10);
    if (Number.isNaN(clientIdNum)) {
      res.status(422).json({ message: "Invalid client id" });
      return;
    }

    const client = await User.findOne({
      where: { id: clientIdNum, role: "client" },
    });

    if (!client) {
      res.status(404).json({ message: "Client not found" });
      return;
    }

    if (client.status === "active") {
      if (client.assignedCoachId === req.user.id) {
        await ensureDefaultPlanForCoachClient(req.user.id, clientIdNum);
        res.status(200).json({ message: "Client is already approved", client });
        return;
      }
      res.status(403).json({ message: "This client is already active with another coach" });
      return;
    }

    if (client.status === "rejected") {
      res.status(403).json({ message: "This client application was rejected" });
      return;
    }

    if (client.assignedCoachId != null && client.assignedCoachId !== req.user.id) {
      res.status(403).json({ message: "This client is assigned to another coach" });
      return;
    }

    if (client.assignedCoachId === null) {
      const [affected] = await User.update(
        { assignedCoachId: req.user.id, status: "active" },
        {
          where: {
            id: clientIdNum,
            role: "client",
            status: "pending",
            assignedCoachId: null,
          },
        }
      );

      if (affected === 0) {
        const refreshed = await User.findByPk(clientIdNum);
        if (refreshed?.status === "active" && refreshed.assignedCoachId === req.user.id) {
          await ensureDefaultPlanForCoachClient(req.user.id, clientIdNum);
          res.status(200).json({ message: "Client approved successfully", client: refreshed });
          return;
        }
        res.status(409).json({
          message: "Another coach accepted this client first",
        });
        return;
      }

      const updated = await User.findByPk(clientIdNum);
      await ensureDefaultPlanForCoachClient(req.user.id, clientIdNum);
      res.status(200).json({ message: "Client approved successfully", client: updated });
      return;
    }

    client.status = "active";
    await client.save();

    await ensureDefaultPlanForCoachClient(req.user.id, clientIdNum);
    res.status(200).json({ message: "Client approved successfully", client });
  } catch (error) {
    next(error);
  }
};

const rejectClient = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can reject clients" });
      return;
    }

    const clientIdNum = parseInt(req.params.clientId, 10);
    if (Number.isNaN(clientIdNum)) {
      res.status(422).json({ message: "Invalid client id" });
      return;
    }

    const client = await User.findOne({
      where: { id: clientIdNum, role: "client" },
    });

    if (!client) {
      res.status(404).json({ message: "Client not found" });
      return;
    }

    if (client.status !== "pending") {
      res.status(403).json({ message: "Only pending clients can be rejected" });
      return;
    }

    if (client.assignedCoachId != null && client.assignedCoachId !== req.user.id) {
      res.status(403).json({ message: "This client is assigned to another coach" });
      return;
    }

    client.status = "rejected";
    await client.save();

    res.status(200).json({ message: "Client rejected", client });
  } catch (error) {
    next(error);
  }
};

const getAssignedClients = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can view assigned clients" });
      return;
    }
    const users = await User.findAll({
      where: { role: "client", status: "active", assignedCoachId: req.user.id },
      attributes: ["id", "firstName", "lastName", "email"],
      order: [["firstName", "ASC"]],
    });
    const list = users.map((u) => {
      const j = u.toJSON();
      return { id: j.id, first_name: j.firstName, last_name: j.lastName, email: j.email };
    });
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

const getMyClients = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can view their clients" });
      return;
    }

    const clients = await sequelize.query(
      `SELECT u.id, u."firstName" as first_name, u."lastName" as last_name, u.email, u.status, u."createdAt" as created_at,
              COUNT(DISTINCT CASE WHEN (TRIM(COALESCE(p."dietText", '')) != '' OR TRIM(COALESCE(p."workoutText", '')) != '') THEN p.id END) as "planCount",
              COUNT(DISTINCT pl.id) as "logCount"
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

    res.status(200).json(clients);
  } catch (error) {
    next(error);
  }
};

const reviewProgressLog = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can review progress logs" });
      return;
    }

    const { logId } = req.params;
    const { action, feedback } = req.body;

    const logResults = await sequelize.query(
      `SELECT pl.* FROM "progress_logs" pl
       INNER JOIN users u ON u.id = pl."clientId"
       WHERE pl.id = :logId AND u."assignedCoachId" = :coachId`,
      {
        replacements: { logId, coachId: req.user.id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!logResults || logResults.length === 0) {
      res.status(404).json({ message: "Progress log not found or not authorized" });
      return;
    }

    const progressLog = await ProgressLog.findByPk(logId);

    if (action === "approve") {
      progressLog.status = "approved";
      await progressLog.save();

      await Feedback.destroy({ where: { progressLogId: logId } });

      res.status(200).json({ message: "Progress log approved", progressLog });
    } else if (action === "reject") {
      if (!feedback) {
        res.status(422).json({ message: "Feedback is required when rejecting" });
        return;
      }

      progressLog.status = "rejected";
      await progressLog.save();

      const [feedbackRow, created] = await Feedback.findOrCreate({
        where: { progressLogId: logId },
        defaults: {
          progressLogId: logId,
          coachId: req.user.id,
          feedback,
        },
      });

      if (!created) {
        feedbackRow.feedback = feedback;
        await feedbackRow.save();
      }

      res.status(200).json({
        message: "Progress log rejected with feedback",
        progressLog,
        feedback: feedbackRow,
      });
    } else {
      res.status(422).json({ message: "Invalid action. Use 'approve' or 'reject'" });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      const errorMessages = error.errors.map((err) => err.message);
      res.status(422).json({
        status: "fail",
        message: "Validation Error",
        errors: errorMessages,
      });
      return;
    }
    next(error);
  }
};

const LOG_WINDOW = 12;

const getCoachAdherenceOverview = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can view adherence insights" });
      return;
    }

    const clients = await User.findAll({
      where: {
        role: "client",
        status: "active",
        assignedCoachId: req.user.id,
      },
      attributes: ["id", "firstName", "lastName", "email"],
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });

    const mean = (arr) => {
      if (!arr || arr.length === 0) return null;
      return Math.round((arr.reduce((a, b) => a + Number(b), 0) / arr.length) * 10) / 10;
    };

    const clientRows = await Promise.all(
      clients.map(async (c) => {
        const logs = await ProgressLog.findAll({
          where: { clientId: c.id },
          order: [["weekStartDate", "DESC"]],
          limit: LOG_WINDOW,
          attributes: [
            "id",
            "weekStartDate",
            "weight",
            "mealAdherence",
            "workoutCompletion",
            "progressPercentage",
            "status",
            "createdAt",
          ],
        });

        const jsonLogs = logs.map((l) => l.toJSON());
        const overalls = jsonLogs.map((l) => l.progressPercentage).filter((x) => x != null);
        const meals = jsonLogs.map((l) => l.mealAdherence).filter((x) => x != null);
        const wos = jsonLogs.map((l) => l.workoutCompletion).filter((x) => x != null);

        const scoredLogs = jsonLogs.filter((l) => l.progressPercentage != null);
        const hits80 = scoredLogs.filter((l) => l.progressPercentage >= 80).length;
        const consistencyPct80 =
          scoredLogs.length === 0 ? null : Math.round((hits80 / scoredLogs.length) * 100);

        const latest = jsonLogs[0];

        const overallAvg = mean(overalls);
        const mealAvg = mean(meals);
        const woAvg = mean(wos);

        return {
          client: {
            id: c.id,
            first_name: c.firstName,
            last_name: c.lastName,
            email: c.email,
          },
          logsInSample: jsonLogs.length,
          weeksInSample: jsonLogs.length,
          averages: {
            overallProgress: overallAvg != null ? overallAvg : 0,
            mealAdherence: mealAvg != null ? mealAvg : 0,
            workoutCompletion: woAvg != null ? woAvg : 0,
          },
          consistencyPct80,
          latestLog: latest
            ? {
                id: latest.id,
                logDate: latest.weekStartDate,
                weekStartDate: latest.weekStartDate,
                status: latest.status,
                overallPercent: latest.progressPercentage,
                mealPercent: latest.mealAdherence,
                workoutPercent: latest.workoutCompletion,
                weight: latest.weight,
                submittedAt: latest.createdAt,
              }
            : null,
          recentLogs: jsonLogs.slice(0, 5).map((l) => ({
            id: l.id,
            logDate: l.weekStartDate,
            weekStartDate: l.weekStartDate,
            status: l.status,
            overallPercent: l.progressPercentage,
            mealPercent: l.mealAdherence,
            workoutPercent: l.workoutCompletion,
          })),
        };
      })
    );

    const summary = {
      activeClients: clientRows.length,
      teamAverageOverall:
        clientRows.length === 0
          ? null
          : Math.round(
              (clientRows.reduce((sum, r) => sum + (r.averages.overallProgress ?? 0), 0) /
                clientRows.length) *
                10
            ) / 10,
    };

    res.status(200).json({ summary, clients: clientRows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingClients,
  approveClient,
  rejectClient,
  getAssignedClients,
  getMyClients,
  reviewProgressLog,
  getCoachAdherenceOverview,
};
