const User = require("../models/user.model");
const { ValidationError, UniqueConstraintError } = require("sequelize");
const { sequelize } = require("../config/database/sequelize.config");
const bcryptjs = require("bcryptjs");
const { uploadImage, deleteImage, extractPublicIdFromUrl } = require("../utils/cloudinary.util");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const register = async (req, res, next) => {
  try {
    const newUser = User.build({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || "client",
      status: req.body.role === "coach" ? "active" : "pending",
    });
    
    const user = await newUser.save();

    const token = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({ 
      user, 
      token, 
      refreshToken
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      res.status(422).json({ message: "Email already exists" });
      return;
    }
    if (error instanceof ValidationError) {
      const isDuplicateEmail = error.errors?.some(
        (err) => err.type === "unique violation" || (err.path === "email" && (err.validatorKey === "not_unique" || err.message?.toLowerCase().includes("unique")))
      );
      if (isDuplicateEmail) {
        res.status(422).json({ message: "Email already exists" });
        return;
      }
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

const login = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.email },
      attributes: { include: ["password", "refreshToken"] },
    });
    const errors = { emailOrPassword: "Invalid email or password" };

    if (!user) {
      res.status(422).json(errors);
      return;
    }

    const isPasswordAuthentic = await user.validatePassword(req.body.password);
    if (!isPasswordAuthentic) {
      res.status(422).json(errors);
      return;
    }
    
    const token = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({ user, refreshToken, token });
  } catch (error) {
    next(error);
  }
};

const currentUser = async (req, res, next) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = req.user.id;
    const { firstName, lastName, email } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        res.status(422).json({ message: "Email already in use" });
        return;
      }
      user.email = email;
    }

    await user.save();

    res.status(200).json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePicture: user.profilePicture,
      },
    });
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

const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.profilePicture) {
      try {
        const publicId = extractPublicIdFromUrl(user.profilePicture);
        if (publicId) {
          await deleteImage(publicId);
        }
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }

    const uploadResult = await uploadImage(req.file.buffer, "mjnutrafit/profile-pictures");

    user.profilePicture = uploadResult.secure_url;
    await user.save();

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(422).json({ message: "Current password and new password are required" });
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 50) {
      res.status(422).json({ message: "New password must be between 6 and 50 characters" });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ message: "New password must be different from current password" });
      return;
    }

    const user = await User.findByPk(userId, {
      attributes: { include: ["password"] },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isCurrentPasswordValid = await user.validatePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(422).json({ message: "Current password is incorrect" });
      return;
    }

    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  currentUser,
  updateProfile,
  uploadProfilePicture,
  changePassword,
  upload,
};
