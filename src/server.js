import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { router as apiRoutes } from "./routes/index.js";
import {connectDB} from "./configs/mongodb.js";
import { startReminderService } from "./utils/reminderService.js";

const port=3000;
const app=express();

app.use(cors({
  origin: [
    "https://remidermood.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api",apiRoutes);

// Home route to prevent infinite redirect on root
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Diary API" });
});

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API route not found",
    path: req.originalUrl,
  });
});

// Catch-all route to handle undefined browser routes and redirect to home page
app.use((req, res) => {
  res.redirect("/");
});

// Centralized error handling middleware - MUST BE LAST
app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 && isProd
    ? "Internal Server Error"
    : err.message || "Internal Server Error!";

  console.error(err.stack);
  res.status(status).json({
    success: false,
    error: message,
    message,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(isProd ? {} : { stack: err.stack }),
  });
});

//await connectDB();
await connectDB();
startReminderService();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
