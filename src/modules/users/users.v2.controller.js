import { User } from "./user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const userResponse = (doc) => {
  const user = doc.toObject();
  delete user.password;
  return user;
};

export const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
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
      err.status(400);
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
     return res.status(400).json({success:false,error:err});
    }
  }else {
    const err =new Error("username,email and password are required")
    err.status=400;
    return res.status(400).json({success:false,error:err});
  }

}


export const createUserWithHash= async(req,res,next)=>{
  try {
    const {name,username,email,password,role}=req.body;

    if(!username || !email || !password) {
      return res.status(400).json({success:false,error:"username, email and password are required"});
    }

    const usernameexists=await User.findOne({username:username});
    const emailexists=await User.findOne({email:email});

    if(usernameexists) return res.status(400).json({success:false,error:"username already exists"})
    if(emailexists) return res.status(400).json({success:false,error:"email already exists"})

    const doc=await User.create({name,username,email,password,role:role||'user'})

    return res.status(201).json({
      success:true, 
      data:userResponse(doc),
      result:"register successful" 
    })
  } catch (err) {
    next(err);
  }
}




export const login= async(req,res,next)=>{
  try{
const {username,email,password,role}=req.body||{};

const userInfo=await User.findOne({email:email}).select('+password');
//console.log(userInfo.password);

if(!userInfo||!email)return res.status(400).json({success:false,error:"email doesn't exists"})
else if(!password){res.status(400).json({success:false,error:"please input password"})}
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