import express from "express";
import { Router } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { router as apiRoutes } from "./routes/index.js";
import {connectDB} from "./configs/mongodb.js";
import { connectSupabase } from "./configs/supabase.js";
import { startReminderService } from "./utils/reminderService.js";

const port=3000;
const app=express();

app.use(cors({
  origin: ["https://remidermood.vercel.app", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api",apiRoutes);

// Home route to prevent infinite redirect on root
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Diary API" });
});

// Catch-all route to handle undefined routes and redirect to home page
app.use((req, res) => {
  res.redirect("/");
});

// Centralized error handling middleware - MUST BE LAST
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error!",
    message: err.message || "Internal Server Error!",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: err.stack,
  });
});

//await connectSupabase();
await connectDB();
startReminderService();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});