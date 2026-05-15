import { Router } from "express";
import { User } from "../../modules/users/user.model.js";


export const router=Router();

const userResponse=(doc)=>{
  const user=doc.toObject();
  delete user.password;
  return user;

}

router.get("/",async (req,res)=>{
    try{
     const users=await User.find();
     return res.status(200).json({success:true,data:users});
    }catch(err){
      return res.status(400).json({success:false,error:err});
    }
      
})


router.post("/",async(req,res)=>{
  
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

});

