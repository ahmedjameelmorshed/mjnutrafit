const { sequelize } = require("./sequelize.config");
const User = require("../../models/user.model");
const Plan = require("../../models/plan.model");
const ProgressLog = require("../../models/progress-log.model");
const Feedback = require("../../models/feedback.model");
const ClientProfile = require("../../models/client-profile.model");
const { setupAssociations } = require("./associations.config");

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");
    
    setupAssociations();
    
    try {
      await sequelize.sync({ alter: true });
      console.log("Database models synchronized.");
    } catch (syncError) {
      const errorMessage = syncError.message || syncError.toString();
      if (errorMessage.includes("duplicate key value violates unique constraint") || 
          errorMessage.includes("pg_type_typname_nsp_index") ||
          errorMessage.includes("duplicate_object")) {
        console.log("Database models synchronized (some types already exist, this is normal).");
      } else {
        console.warn("Database sync warning:", errorMessage);
        console.log("Continuing with existing database schema...");
      }
    }

    try {
      await ClientProfile.sync();
      console.log("Client profiles table ready.");
    } catch (clientProfileSyncError) {
      console.warn("Client profiles sync warning:", clientProfileSyncError.message || clientProfileSyncError);
    }

    try {
      await ProgressLog.sync({ alter: true });
      console.log("Progress logs table ready.");
    } catch (progressLogSyncError) {
      console.warn("Progress logs sync warning:", progressLogSyncError.message || progressLogSyncError);
    }

    try {
      await Plan.sync({ alter: true });
      console.log("Plans table ready.");
    } catch (planSyncError) {
      console.warn("Plans sync warning:", planSyncError.message || planSyncError);
    }
  } catch (error) {
    console.error("Unable to connect to the database:", error.message || error);
    console.log("Server will continue but database operations may fail.");
  }
};

module.exports = { initializeDatabase };
