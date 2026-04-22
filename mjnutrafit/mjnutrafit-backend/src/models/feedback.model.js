const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database/sequelize.config");

class Feedback extends Model {}

Feedback.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      unique: true,
    },
    progressLogId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "progress_log_id",
      references: {
        model: "progress_logs",
        key: "id",
      },
    },
    coachId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "coach_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Feedback is required",
        },
      },
    },
  },
  {
    sequelize,
    tableName: "feedbacks",
    timestamps: true,
  }
);

module.exports = Feedback;
