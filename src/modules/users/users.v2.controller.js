import { User } from "./user.model.js";
import { PendingRegistration } from "./pendingRegistration.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const REGISTRATION_CONFIRMATION_WINDOW_MS = 60 * 1000;

const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");

const getFrontendUrl = (req) => (
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  req.get("origin") ||
  "http://localhost:5173"
).replace(/\/$/, "");

const sendRegistrationEmail = async (to, confirmationUrl) => {
  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS ||
    process.env.EMAIL_USER === "your-email@gmail.com" ||
    process.env.EMAIL_PASS === "your-app-password"
  ) {
    console.warn(`Registration email skipped. Confirmation link: ${confirmationUrl}`);
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Diary App" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Confirm your Diary App registration",
      text: `Confirm your registration within 1 minute: ${confirmationUrl}`,
      html: `
        <p>Confirm your Diary App registration within 1 minute.</p>
        <p><a href="${confirmationUrl}">Confirm registration</a></p>
      `,
    });

    return true;
  } catch (error) {
    console.error("Registration email error:", error);
    console.warn(`Confirmation link: ${confirmationUrl}`);
    return false;
  }
};

const userResponse = (doc) => {
  const user = doc.toObject();
  delete user.password;
  return user;
};

export const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    console.log("Google Login attempt with token:", token ? "Token present" : "Token missing");
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log("Google token verified for email:", payload.email);
    const { sub, email, name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });

    if (!user) {
      // Create new user if doesn't exist
      user = await User.create({
        googleId: sub,
        email,
        name,
        username: email.split("@")[0] + Math.floor(Math.random() * 1000),
        profilePic: picture,
        role: "user",
      });
    } else if (!user.googleId) {
      // Link Google ID if user exists by email
      user.googleId = sub;
      user.profilePic = picture;
      await user.save();
    }

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Google Login successful",
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
    });
  } catch (err) {
    next(err);
  }
};

  export const getUsers = async (req, res, next) => {
  try{

     const users=await User.find();
     return res.status(200).json({success:true,data:users});
    }catch(err){
  //      return res.status(400).json({success:false,error:err});
      err.status = 400;
      next(err);
    }
  }
  export const updateUser = async(req,res)=>{
  try{
  const doc=await User.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    {runValidators:true,returnDocument:'after'}
  )
  if(!doc){return res.status(404).json({error:"user not found"})}
  return res.status(200).json({success:true,data:userResponse(doc)});
  }catch(err){
  return res.status(400).json({error:err.message})

  }}

  export const createUser= async(req,res)=>{

     const {username,email,password,role}=req.body;

  if(username&&password&&email){
    try{

    const doc=await User.create({username,email,password,role});
    return res.status(201).json({success:true,data:userResponse(doc) })

    }catch(err){
     return res.status(400).json({success:false,error:err.message});
    }
  }else {
    const err =new Error("username,email and password are required")
    err.status=400;
    return res.status(400).json({success:false,error:err.message});
  }

  }


  export const createUserWithHash= async(req,res,next)=>{
  try {
    const {name,username,email,password}=req.body;

    if(!username || !email || !password) {
      return res.status(400).json({success:false,error:"username, email and password are required"});   
    }

    const usernameexists=await User.findOne({username:username});
    const emailexists=await User.findOne({email:email});

    if(usernameexists) return res.status(400).json({success:false,error:"username already exists"})     
    if(emailexists) return res.status(400).json({success:false,error:"email already exists"})

    const now = new Date();
    const activePending = await PendingRegistration.findOne({
      expiresAt: { $gt: now },
      $or: [{ username }, { email }],
    });

    if (activePending) {
      return res.status(409).json({
        success: false,
        error: "registration confirmation already pending for this username or email",
      });
    }

    const confirmationToken = crypto.randomBytes(32).toString("hex");
    const confirmationUrl = `${getFrontendUrl(req)}/confirm-registration?token=${confirmationToken}`;
    const passwordHash = await bcrypt.hash(password, 12);

    await PendingRegistration.create({
      name,
      username,
      email,
      passwordHash,
      role: "user",
      tokenHash: tokenHash(confirmationToken),
      expiresAt: new Date(now.getTime() + REGISTRATION_CONFIRMATION_WINDOW_MS),
    });

    const emailSent = await sendRegistrationEmail(email, confirmationUrl);

    await PendingRegistration.updateOne(
      { tokenHash: tokenHash(confirmationToken) },
      { $set: { emailSentAt: emailSent ? new Date() : null } }
    );

    return res.status(202).json({
      success:true,
      message: emailSent
        ? "Check your email to confirm registration within 1 minute."
        : "Registration is pending. Email is not configured, so check the backend console for the confirmation link.",
    })
  } catch (err) {
    next(err);
  }
  }

  export const confirmRegistration = async (req, res, next) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({ success: false, error: "confirmation token is required" });
    }

    const pending = await PendingRegistration.findOne({ tokenHash: tokenHash(token) });

    if (!pending) {
      return res.status(404).json({ success: false, error: "registration request not found" });
    }

    if (pending.expiresAt <= new Date()) {
      return res.status(410).json({ success: false, error: "registration link expired" });
    }

    const usernameexists = await User.findOne({ username: pending.username });
    const emailexists = await User.findOne({ email: pending.email });

    if (usernameexists || emailexists) {
      await PendingRegistration.findByIdAndDelete(pending._id);
      return res.status(409).json({
        success: false,
        error: usernameexists ? "username already exists" : "email already exists",
      });
    }

    const now = new Date();
    const result = await User.collection.insertOne({
      name: pending.name,
      username: pending.username,
      email: pending.email,
      password: pending.passwordHash,
      role: pending.role || "user",
      createdAt: now,
      updatedAt: now,
    });

    await PendingRegistration.findByIdAndDelete(pending._id);

    return res.status(201).json({
      success: true,
      message: "Registration confirmed. You can now log in.",
      data: {
        _id: result.insertedId,
        username: pending.username,
        email: pending.email,
        role: pending.role || "user",
        name: pending.name,
      },
    });
  } catch (err) {
    next(err);
  }
  };

  export const getPendingRegistrations = async (req, res, next) => {
  try {
    const now = new Date();
    const pending = await PendingRegistration.find()
      .select("-passwordHash -tokenHash")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: pending.map((item) => ({
        ...item.toObject(),
        expired: item.expiresAt <= now,
      })),
    });
  } catch (err) {
    next(err);
  }
  };

  export const deletePendingRegistration = async (req, res, next) => {
  try {
    const pending = await PendingRegistration.findByIdAndDelete(req.params.id);
    if (!pending) {
      return res.status(404).json({ success: false, error: "registration request not found" });
    }

    return res.status(200).json({ success: true, message: "Registration request dropped" });
  } catch (err) {
    next(err);
  }
  };




  export const login= async(req,res,next)=>{
  try{
  const {username,email,password,role}=req.body||{};

  const userInfo=await User.findOne({email:email}).select('+password');
  //console.log(userInfo.password);

  if(!userInfo||!email)return res.status(400).json({success:false,error:"email doesn't exists"})
  else if(!password) return res.status(400).json({success:false,error:"please input password"})
  else{
  console.log(userInfo.password,password);
  const isPasswordCorrect=await bcrypt.compare(password,userInfo.password)

console.log(isPasswordCorrect);
   if(isPasswordCorrect){
const token =jwt.sign({userId:userInfo._id},process.env.JWT_SECRET,{expiresIn:"1h"})
console.log(token);
const isProd=process.env.NODE_ENV==="production";
res.cookie('accessToken',token,{
  httpOnly:true,
  secure:isProd,
  sameSite:isProd?"none":"lax",
  path:"/",
    maxAge: 60 * 60 * 1000
})

//console.log("in if")
   return res.status(200).json({
      success: true,
      message: "Login successfully!",
      _id: userInfo._id,
      username: userInfo.username,
      email: userInfo.email,
      role: userInfo.role,
    });
   } else {
     return res.status(401).json({ success: false, error: "Invalid password" });
   }
  
  
}
}catch(err){next(err)}



}















export const deleteUser=async(req,res)=>{

  try{
  const doc=await User.findByIdAndDelete(req.params.id)
if(!doc){return res.status(404).json({error:"user not found"})}
  return res.status(200).json({success:true,data:userResponse(doc)});
}catch(err){
return res.status(400).json({error:err.message})}



}
