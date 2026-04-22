const { DataTypes, Model } = require("sequelize");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const validator = require("validator");
const { sequelize } = require("../config/database/sequelize.config");
const config = require("../config/database/database.config");

class User extends Model {
  generateToken() {
    return jwt.sign(
      {
        id: this.id,
        email: this.email,
      },
      config.jwtSecret,
      { expiresIn: "24h" }
    );
  }

  generateRefreshToken() {
    return jwt.sign(
      {
        id: this.id,
        email: this.email,
      },
      config.refreshTokenSecret,
      { expiresIn: "7d" }
    );
  }

  async validatePassword(password) {
    if (!this.password) {
      throw new Error("Password is not set");
    }
    return bcryptjs.compare(password, this.password);
  }
}

User.prototype.toJSON = function () {
  const { password, refreshToken, ...attributes } = this.get();
  return attributes;
};

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      unique: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "First name is required",
        },
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Last name is required",
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: "Email is required",
        },
        isEmailValid(value) {
          if (!validator.isEmail(value)) {
            throw new Error("Invalid email address");
          }
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Password is required",
        },
        len: {
          args: [6, 255],
          msg: "Password must be between 6 and 50 characters",
        },
      },
    },
    role: {
      type: DataTypes.ENUM("client", "coach"),
      allowNull: false,
      defaultValue: "client",
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profilePicture: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assignedCoachId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
  }
);

User.beforeCreate(async (user) => {
  const salt = await bcryptjs.genSalt(10);
  if (user.password) {
    user.password = await bcryptjs.hash(user.password, salt);
  }
});

module.exports = User;
