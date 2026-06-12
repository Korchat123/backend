import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    emailSentAt: { type: Date },
  },
  { timestamps: true }
);

export const PendingRegistration = mongoose.model(
  "PendingRegistration",
  pendingRegistrationSchema
);
