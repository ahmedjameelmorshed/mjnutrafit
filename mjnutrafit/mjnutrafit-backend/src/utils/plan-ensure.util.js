const Plan = require("../models/plan.model");

async function ensureDefaultPlanForCoachClient(coachId, clientId) {
  const existing = await Plan.findOne({ where: { clientId, coachId } });
  if (existing) return existing;

  const other = await Plan.findOne({ where: { clientId } });
  if (other) return null;

  try {
    return await Plan.create({
      coachId,
      clientId,
      dietText: "",
      workoutText: "",
      dietPlan: null,
      workoutPlan: null,
      planDays: [],
      isActive: true,
    });
  } catch {
    return Plan.findOne({ where: { clientId, coachId } });
  }
}

module.exports = { ensureDefaultPlanForCoachClient };
