import { Router } from "express";
import { User } from "../../modules/users/user.model.js";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  createUserWithHash,
  confirmRegistration,
  getPendingRegistrations,
  deletePendingRegistration,
  login,
  googleLogin,
} from "../../modules/users/users.v2.controller.js";
import { authUser } from "../../middlewares/auth.js";
export const router = Router();

const PG_SELECT = "id,username,email,role,created_at,updated_at";

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }
    next();
  } catch (err) {
    next(err);
  }
};

router.get("/", getUsers);

router.post("/", createUser);
router.post("/hashpass/", createUserWithHash);
router.post("/confirm-registration", confirmRegistration);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.get("/pending-registrations", authUser, adminOnly, getPendingRegistrations);
router.delete("/pending-registrations/:id", authUser, adminOnly, deletePendingRegistration);

router.get("/auth/me", authUser, async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "user not found" });
    }
    return res.status(200).json({
      success: true,
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      profilePic: user.profilePic,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/logout", (req, res, next) => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});

router.put("/subscribe", authUser, async (req, res, next) => {
  try {
    const { subscription, timeZone } = req.body;
    await User.findByIdAndUpdate(req.userId, { pushSubscription: subscription, timeZone });
    res.status(200).json({ success: true, message: "Subscribed to push notifications" });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);
