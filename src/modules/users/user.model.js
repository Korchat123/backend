import mongoose from "mongoose";
import bcrypt from "bcrypt";
const userSchema = mongoose.Schema(
  {
    name: { type: String, trim: true },
    username: { type: String, required: true, trim: true, unique: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, minlength: 8, select: false },
    googleId: { type: String, unique: true, sparse: true },
    profilePic: { type: String },
    pushSubscription: { type: Object }, // Store Web Push subscription
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return ;
  }
    this.password = await bcrypt.hash(this.password, 12);
    
});

export const User = mongoose.model("User", userSchema);