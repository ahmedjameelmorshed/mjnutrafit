const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const userRouter = require("./routes/user.route");
const authRouter = require("./routes/auth.route");
const planRouter = require("./routes/plan.route");
const progressRouter = require("./routes/progress.route");
const coachRouter = require("./routes/coach.route");
const dashboardRouter = require("./routes/dashboard.route");
const aiCoachRouter = require("./routes/ai-coach.route");

const app = express();

const corsOptions = {
  origin: ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/plans", planRouter);
app.use("/api/progress", progressRouter);
app.use("/api/coach", coachRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/ai-coach", aiCoachRouter);

app.use((err, req, res, next) => {
  console.error("Error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ 
    message, 
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }) 
  });
});

module.exports = app;
