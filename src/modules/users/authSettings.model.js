import mongoose from "mongoose";

const authSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "auth",
    },
    registrationExpireMinutes: {
      type: Number,
      min: 1,
      max: 1440,
      default: 1,
    },
  },
  { timestamps: true }
);

export const AuthSettings = mongoose.model("AuthSettings", authSettingsSchema);
