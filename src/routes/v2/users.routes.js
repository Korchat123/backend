import { Router } from "express";
import { User } from "../../modules/users/user.model.js";
import { supabase } from "../../configs/supabase.js";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  createUserWithHash,
  login,
  googleLogin,
} from "../../modules/users/users.v2.controller.js";
import { authUser } from "../../middlewares/auth.js";
export const router = Router();

const PG_SELECT = "id,username,email,role,created_at,updated_at";

router.get("/", getUsers);

router.post("/", createUser);
router.post("/hashpass/", createUserWithHash);
router.post("/login", login);
router.post("/google-login", googleLogin);

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
    const { subscription } = req.body;
    await User.findByIdAndUpdate(req.userId, { pushSubscription: subscription });
    res.status(200).json({ success: true, message: "Subscribed to push notifications" });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);







// router.get("/pg",async (req,res)=>{
//     try{
      
//      const {data,error}=await supabase.from('users').select(PG_SELECT);
//     if(error)throw error;
//      return res.status(200).json({success:true,data});
//      console.log("success in pg");
//     }catch(err){
//       console.log("error in pg");
//       return res.status(400).json({success:false,error:err});
//     throw err;
//     }
      
// })


// router.post("/pg",async(req,res)=>{
  
//      const {username,email,password,role}=req.body;

//   if(username&&password&&email){
//     try{
//       const {data,error}=await supabase
//       .from("users")
//       .insert({username,email,password,role:role||'user'})
//       .select(PG_SELECT)
//       .single()
//       if(error)throw error;
//       res.status(200).json({success:true,data});

//     }catch(err){
//      return res.status(400).json({success:false,error:err.message});
//      throw err;
//     }
//   }else {
//     const err =new Error("username,email and password are required")
//     err.status=400;
//      res.status(400).json({success:false,error:err});
//     throw err;
//     }

// });

// router.put("/pg/:id",async (req,res)=>{
//    const {username,email,password,role}=req.body;

//   if(await isHaveUser(req.params.id)){
//   try{
//     const{data,error}= await supabase
//       .from('users')
//       .update({username,email,password,role})
//       .eq('id',req.params.id)
//       .select(PG_SELECT)
//     if(error)throw error;
//     return res.status(200).json({success:true,data});
//   }catch(err){  
  
//     return res.status(400).json({success:false,error:err});
//     throw err;
//   }}else{
//     res.status(400).json({success:false,result:"user not found"});
//   }
    
//   })

// router.delete("/pg/:id", async(req,res)=>{
 

  
//   if(await isHaveUser(req.params.id)){
//   try{
    
//       const{data,error}= await supabase
//       .from('users')
//       .delete()
//       .eq('id',req.params.id)
      
      
//       //.select(PG_SELECT)
//       if(error)throw error
//       return res.status(200).json({success:true,result:"delete successfull"})
    
    
//     }catch(err){
//     return res.status(400).json({success:false,error:err});
//      throw err;
//     }
//   }else{
//     res.status(400).json({success:false,result:"user not found"});
//   }


// })