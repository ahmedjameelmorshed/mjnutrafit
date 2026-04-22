const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database/sequelize.config");

class ClientProfile extends Model {}

ClientProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    gender: {
      type: DataTypes.ENUM("male", "female"),
      allowNull: false,
    },
    heightCm: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 100, max: 250 },
    },
    weightKg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: { min: 30, max: 300 },
    },
    goal: {
      type: DataTypes.ENUM("lose_weight", "gain_weight", "get_fit_healthy"),
      allowNull: false,
    },
    targetWeightKg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: { min: 30, max: 300 },
    },
    activityLevel: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "e.g. sedentary, light, moderate, active, very_active",
    },
    medicalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dietaryRestrictions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    additionalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "client_profiles",
    timestamps: true,
  }
);

module.exports = ClientProfile;
