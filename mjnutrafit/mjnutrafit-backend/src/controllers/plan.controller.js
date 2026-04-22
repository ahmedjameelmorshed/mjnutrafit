const Plan = require("../models/plan.model");
const User = require("../models/user.model");
const { ValidationError } = require("sequelize");
const { getDefaultDietPlan, getDefaultWorkoutPlan } = require("../utils/plan-progress.util");
const { ensureDefaultPlanForCoachClient } = require("../utils/plan-ensure.util");

function todayUK() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

function assertPlanDaysNotPastUk(planDays) {
  if (!planDays || !Array.isArray(planDays)) return;
  const today = todayUK();
  const bad = planDays.find((d) => d && d.date && String(d.date) < today);
  if (bad) {
    const err = new Error("All plan day dates must be today or later (UK time)");
    err.statusCode = 422;
    throw err;
  }
}

const createPlan = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can create plans" });
      return;
    }

    const { clientId, dietText, workoutText, dietPlan, workoutPlan, planDays } = req.body;

    const client = await User.findOne({
      where: { id: clientId, role: "client" },
    });

    if (!client) {
      res.status(404).json({ message: "Client not found" });
      return;
    }

    if (client.assignedCoachId !== req.user.id) {
      res.status(403).json({ message: "This client is not assigned to you" });
      return;
    }

    const existing = await Plan.findOne({ where: { clientId } });
    if (existing) {
      res.status(422).json({
        message: "This client already has a plan. Edit the existing plan instead of creating another.",
      });
      return;
    }

    assertPlanDaysNotPastUk(planDays);

    const plan = await Plan.create({
      coachId: req.user.id,
      clientId,
      dietText: dietText ?? "",
      workoutText: workoutText ?? "",
      dietPlan: dietPlan || getDefaultDietPlan(),
      workoutPlan: workoutPlan || getDefaultWorkoutPlan(),
      planDays: planDays && Array.isArray(planDays) ? planDays : null,
      isActive: true,
    });

    res.status(201).json(plan);
  } catch (error) {
    if (error.statusCode === 422 && error.message) {
      res.status(422).json({ message: error.message });
      return;
    }
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

const getPlans = async (req, res, next) => {
  try {
    let plans;

    if (req.user.role === "coach") {
      const clientIdRaw = req.query.clientId;
      if (!clientIdRaw) {
        res.status(200).json([]);
        return;
      }
      const clientId = parseInt(String(clientIdRaw), 10);
      if (Number.isNaN(clientId)) {
        res.status(422).json({ message: "Invalid clientId" });
        return;
      }
      const client = await User.findByPk(clientId);
      if (!client || client.role !== "client" || client.assignedCoachId !== req.user.id) {
        res.status(403).json({ message: "Client not found or not assigned to you" });
        return;
      }
      await ensureDefaultPlanForCoachClient(req.user.id, clientId);
      plans = await Plan.findAll({
        where: { coachId: req.user.id, clientId },
        include: [
          {
            model: User,
            as: "client",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    } else {
      const me = await User.findByPk(req.user.id, { attributes: ["id", "assignedCoachId"] });
      if (me?.assignedCoachId) {
        await ensureDefaultPlanForCoachClient(me.assignedCoachId, req.user.id);
      }

      const activePlans = await Plan.findAll({
        where: { clientId: req.user.id, isActive: true },
        include: [
          {
            model: User,
            as: "coach",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      if (activePlans.length > 0) {
        plans = activePlans;
      } else {
        plans = await Plan.findAll({
          where: { clientId: req.user.id, isActive: false },
          include: [
            {
              model: User,
              as: "coach",
              attributes: ["id", "firstName", "lastName", "email"],
            },
          ],
          order: [["createdAt", "DESC"]],
        });
      }
    }

    res.status(200).json(plans);
  } catch (error) {
    next(error);
  }
};

const getCurrentPlan = async (req, res, next) => {
  try {
    if (req.user.role !== "client") {
      res.status(403).json({ message: "Only clients can view current plan" });
      return;
    }

    const me = await User.findByPk(req.user.id, { attributes: ["id", "assignedCoachId"] });
    if (me?.assignedCoachId) {
      await ensureDefaultPlanForCoachClient(me.assignedCoachId, req.user.id);
    }

    const plan = await Plan.findOne({
      where: { clientId: req.user.id, isActive: true },
      include: [
        {
          model: User,
          as: "coach",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    if (!plan) {
      res.status(404).json({ message: "No active plan found" });
      return;
    }

    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    if (req.user.role !== "coach") {
      res.status(403).json({ message: "Only coaches can update plans" });
      return;
    }

    const { id } = req.params;
    const { dietText, workoutText, dietPlan, workoutPlan, planDays } = req.body;

    const plan = await Plan.findOne({
      where: { id, coachId: req.user.id },
    });

    if (!plan) {
      res.status(404).json({ message: "Plan not found" });
      return;
    }

    if (dietText !== undefined) plan.dietText = dietText;
    if (workoutText !== undefined) plan.workoutText = workoutText;
    if (dietPlan !== undefined) plan.dietPlan = dietPlan;
    if (workoutPlan !== undefined) plan.workoutPlan = workoutPlan;
    if (planDays !== undefined) plan.planDays = Array.isArray(planDays) ? planDays : null;

    await plan.save();

    res.status(200).json(plan);
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

module.exports = {
  createPlan,
  getPlans,
  getCurrentPlan,
  updatePlan,
};
