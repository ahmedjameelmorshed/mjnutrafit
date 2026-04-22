const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const config = require("../config/database/database.config");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ message: "Authorization header is missing" });
      return;
    }

    const jwtToken = authHeader.split(" ").pop();

    if (!jwtToken) {
      res.status(401).json({ message: "Token is missing" });
      return;
    }

    const decodedData = jwt.verify(
      jwtToken,
      config.jwtSecret
    );

    const user = await User.findOne({ where: { id: decodedData.id } });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user.toJSON();
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};

module.exports = authMiddleware;
