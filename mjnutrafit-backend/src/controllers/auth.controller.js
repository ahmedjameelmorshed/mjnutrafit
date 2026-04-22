const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const config = require("../config/database/database.config");

const refreshToken = async (req, res, next) => {
  try {
    const { id, email, refreshToken } = req.body;

    if (!id || !email || !refreshToken) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findOne({ where: { id } });

    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    jwt.verify(
      refreshToken,
      config.refreshTokenSecret,
      (err, decoded) => {
        if (err || !decoded) {
          res.status(403).json({ message: "Invalid refresh token" });
          return;
        }

        if (decoded.id !== user.id || decoded.email !== user.email) {
          res.status(403).json({ message: "Token payload mismatch" });
          return;
        }

        const token = user.generateToken();
        const newRefreshToken = user.generateRefreshToken();

        user.refreshToken = newRefreshToken;
        user.save();

        res.status(200).json({ token });
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { refreshToken };
