const User = require("../../models/user.model");
const Plan = require("../../models/plan.model");
const ProgressLog = require("../../models/progress-log.model");
const Feedback = require("../../models/feedback.model");
const ClientProfile = require("../../models/client-profile.model");

const setupAssociations = () => {
  ClientProfile.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasOne(ClientProfile, { foreignKey: "userId", as: "clientProfile" });

  Plan.belongsTo(User, { foreignKey: "coachId", as: "coach" });
  User.hasMany(Plan, { foreignKey: "coachId", as: "coachPlans" });

  Plan.belongsTo(User, { foreignKey: "clientId", as: "client" });
  User.hasMany(Plan, { foreignKey: "clientId", as: "clientPlans" });

  ProgressLog.belongsTo(User, { foreignKey: "clientId", as: "client" });
  User.hasMany(ProgressLog, { foreignKey: "clientId", as: "progressLogs" });

  Feedback.belongsTo(ProgressLog, { foreignKey: "progressLogId", as: "progressLog" });
  ProgressLog.hasOne(Feedback, { foreignKey: "progressLogId", as: "feedback" });

  Feedback.belongsTo(User, { foreignKey: "coachId", as: "coach" });
  User.hasMany(Feedback, { foreignKey: "coachId", as: "feedbacks" });
};

module.exports = { setupAssociations };
