const ProgressLog = require("../models/progress-log.model");
const Feedback = require("../models/feedback.model");
const User = require("../models/user.model");
const Plan = require("../models/plan.model");
const { ValidationError } = require("sequelize");
const { sequelize } = require("../config/database/sequelize.config");
const { computeAdherenceBreakdown } = require("../utils/plan-progress.util");

function parseWeightInput(weight) {
  if (weight === undefined || weight === null || weight === "") return { provided: false, value: null };
  const n = typeof weight === "number" ? weight : parseFloat(String(weight).trim(), 10);
  if (Number.isNaN(n) || n <= 0) return { provided: true, invalid: true };
  return { provided: true, value: n };
}

const submitProgressLog = async (req, res, next) => {
  try {
    if (req.user.role !== "client") {
      res.status(403).json({ message: "Only clients can submit progress logs" });
      return;
    }

    if (req.user.status !== "active") {
      res.status(403).json({ message: "Your account must be approved by a coach first" });
      return;
    }

    const { mealAdherence, workoutCompletion, notes, completions } = req.body;
    const weightRaw = req.body.weight;
    const logDate = req.body.logDate || req.body.weekStartDate;

    if (!logDate) {
      res.status(422).json({ message: "logDate is required (calendar day for this entry, YYYY-MM-DD)" });
      return;
    }

    const wParse = parseWeightInput(weightRaw);
    if (wParse.invalid) {
      res.status(422).json({ message: "Weight must be a positive number when provided" });
      return;
    }

    const existingLog = await ProgressLog.findOne({
      where: {
        clientId: req.user.id,
        weekStartDate: logDate,
      },
    });

    const plan = await Plan.findOne({
      where: { clientId: req.user.id, isActive: true },
    });

    let progressPct = null;
    let mealVal = mealAdherence != null ? parseInt(mealAdherence, 10) : 0;
    let workoutVal = workoutCompletion != null ? parseInt(workoutCompletion, 10) : 0;
    if (Number.isNaN(mealVal)) mealVal = 0;
    if (Number.isNaN(workoutVal)) workoutVal = 0;

    if (completions && typeof completions === "object") {
      const b = computeAdherenceBreakdown(completions, plan, logDate);
      progressPct = b.overallPercent;
      mealVal = b.mealPercent != null ? b.mealPercent : 0;
      workoutVal = b.workoutPercent != null ? b.workoutPercent : 0;
    }

    const payload = {
      mealAdherence: mealVal,
      workoutCompletion: workoutVal,
      notes: notes !== undefined ? notes || null : undefined,
      completions: completions !== undefined ? completions || null : undefined,
      progressPercentage: progressPct,
      status: "submitted",
    };

    if (wParse.provided) {
      payload.weight = wParse.value;
    }

    if (existingLog) {
      const update = {
        mealAdherence: payload.mealAdherence,
        workoutCompletion: payload.workoutCompletion,
        progressPercentage: payload.progressPercentage,
        status: "submitted",
      };
      if (completions !== undefined) update.completions = completions || null;
      if (notes !== undefined) update.notes = notes || null;
      if (wParse.provided) update.weight = payload.weight;

      await existingLog.update(update);
      const fresh = await ProgressLog.findByPk(existingLog.id);
      res.status(200).json(fresh);
      return;
    }

    if (!wParse.provided) {
      payload.weight = null;
    } else {
      payload.weight = wParse.value;
    }
    if (payload.notes === undefined) payload.notes = notes || null;
    if (payload.completions === undefined) payload.completions = completions || null;

    const progressLog = await ProgressLog.create({
      clientId: req.user.id,
      weekStartDate: logDate,
      weight: payload.weight,
      mealAdherence: payload.mealAdherence,
      workoutCompletion: payload.workoutCompletion,
      notes: payload.notes ?? null,
      completions: payload.completions ?? null,
      progressPercentage: progressPct,
      status: "submitted",
    });

    res.status(201).json(progressLog);
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

const getProgressLogs = async (req, res, next) => {
  try {
    let logs;

    if (req.user.role === "coach") {
      const filterClientId = req.query.clientId;
      const clientIdNum =
        filterClientId != null && filterClientId !== ""
          ? parseInt(String(filterClientId), 10)
          : null;
      const hasClientFilter = clientIdNum != null && !Number.isNaN(clientIdNum);

      let query = `SELECT pl.*, u."firstName" as "clientFirstName", u."lastName" as "clientLastName", u.email as "clientEmail"
         FROM "progress_logs" pl
         INNER JOIN users u ON u.id = pl."clientId"
         WHERE u."assignedCoachId" = :coachId`;
      const replacements = { coachId: req.user.id };
      if (hasClientFilter) {
        query += ` AND pl."clientId" = :filterClientId`;
        replacements.filterClientId = clientIdNum;
      }
      query += ` ORDER BY pl."weekStartDate" DESC, pl."updatedAt" DESC`;

      const results = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
      logs = results;
    } else {
      logs = await ProgressLog.findAll({
        where: { clientId: req.user.id },
        include: [
          {
            model: Feedback,
            as: "feedback",
            include: [
              {
                model: User,
                as: "coach",
                attributes: ["id", "firstName", "lastName"],
              },
            ],
          },
        ],
        order: [["updatedAt", "DESC"]],
      });
    }

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

const getProgressLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let log;

    if (req.user.role === "coach") {
      const results = await sequelize.query(
        `SELECT pl.*, u."firstName" as "clientFirstName", u."lastName" as "clientLastName", u.email as "clientEmail"
         FROM "progress_logs" pl
         INNER JOIN users u ON u.id = pl."clientId"
         WHERE pl.id = :logId AND u."assignedCoachId" = :coachId`,
        {
          replacements: { logId: id, coachId: req.user.id },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      log = results[0];
    } else {
      log = await ProgressLog.findOne({
        where: { id, clientId: req.user.id },
        include: [
          {
            model: Feedback,
            as: "feedback",
            include: [
              {
                model: User,
                as: "coach",
                attributes: ["id", "firstName", "lastName"],
              },
            ],
          },
        ],
      });
    }

    if (!log) {
      res.status(404).json({ message: "Progress log not found" });
      return;
    }

    if (req.user.role === "coach" && log.clientId) {
      const plan = await Plan.findOne({
        where: { clientId: log.clientId, isActive: true },
        attributes: ["id", "dietPlan", "workoutPlan", "planDays"],
      });
      log.plan = plan ? plan.toJSON() : null;
    }

    res.status(200).json(log);
  } catch (error) {
    next(error);
  }
};

const getProgressLogForDay = async (req, res, next) => {
  try {
    if (req.user.role !== "client") {
      res.status(403).json({ message: "Only clients can load progress for a day" });
      return;
    }
    const logDate = req.query.logDate || req.query.weekStartDate;
    if (!logDate) {
      res.status(422).json({ message: "logDate query parameter is required (YYYY-MM-DD)" });
      return;
    }
    const log = await ProgressLog.findOne({
      where: { clientId: req.user.id, weekStartDate: logDate },
    });
    res.status(200).json(log || null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitProgressLog,
  getProgressLogs,
  getProgressLogById,
  getProgressLogForDay,
};
