const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database/sequelize.config");

class Plan extends Model {}

Plan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      unique: true,
    },
    coachId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    dietText: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    workoutText: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    dietPlan: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    workoutPlan: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    planDays: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "plans",
    timestamps: true,
  }
);

module.exports = Plan;
