const ClientProfile = require("../models/client-profile.model");
const { ValidationError } = require("sequelize");

const getMyProfile = async (req, res, next) => {
  try {
    if (req.user.role !== "client") {
      res.status(403).json({ message: "Only clients can view their profile" });
      return;
    }
    const profile = await ClientProfile.findOne({
      where: { userId: req.user.id },
    });
    res.status(200).json(profile || null);
  } catch (error) {
    next(error);
  }
};

const submitProfile = async (req, res, next) => {
  try {
    if (req.user.role !== "client") {
      res.status(403).json({ message: "Only clients can submit this form" });
      return;
    }

    const {
      gender,
      heightCm,
      weightKg,
      goal,
      targetWeightKg,
      activityLevel,
      medicalNotes,
      dietaryRestrictions,
      additionalNotes,
    } = req.body;

    if (!gender || !heightCm || !weightKg || !goal) {
      res.status(422).json({
        message: "Gender, height (cm), weight (kg), and goal are required",
      });
      return;
    }

    const [profile] = await ClientProfile.findOrCreate({
      where: { userId: req.user.id },
      defaults: {
        userId: req.user.id,
        gender,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        goal,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
        activityLevel: activityLevel || null,
        medicalNotes: medicalNotes || null,
        dietaryRestrictions: dietaryRestrictions || null,
        additionalNotes: additionalNotes || null,
      },
    });

    if (!profile.isNewRecord) {
      profile.gender = gender;
      profile.heightCm = Number(heightCm);
      profile.weightKg = Number(weightKg);
      profile.goal = goal;
      profile.targetWeightKg = targetWeightKg ? Number(targetWeightKg) : null;
      profile.activityLevel = activityLevel || null;
      profile.medicalNotes = medicalNotes || null;
      profile.dietaryRestrictions = dietaryRestrictions || null;
      profile.additionalNotes = additionalNotes || null;
      await profile.save();
    }

    res.status(200).json({ profile, message: "Profile saved successfully" });
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

module.exports = { getMyProfile, submitProfile };
