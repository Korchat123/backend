import { Router } from "express";
import { User } from "../../modules/users/user.model.js";
import { supabase } from "../../configs/supabase.js";
import { getUsers,createUser,updateUser,deleteUser } from "../../modules/users/users.controller.js";
export const router=Router();

const userResponse=(doc)=>{
  const user=doc.toObject();
  delete user.password;
  return user;

}
const isHaveUser= async(id)=>{
  let haveUser=false;
  try{
 const{data,error}= await supabase
      .from('users')
      .select(PG_SELECT)
      .eq('id',id)
  if(error)throw error
  if(data&&data.length>0){
    haveUser=true;
  console.log("found",data);
  }else{
    console.log("nodata")
  }

  }catch(err){
    throw err;
  }
return(haveUser);


}

router.get("/",getUsers)


router.post("/",createUser);

router.put("/:id",updateUser );


router.delete("/:id",deleteUser );





const PG_SELECT="id,username,email,role,created_at,updated_at";


router.get("/pg",async (req,res)=>{
    try{
      
     const {data,error}=await supabase.from('users').select(PG_SELECT);
    if(error)throw error;
     return res.status(200).json({success:true,data});
     console.log("success in pg");
    }catch(err){
      console.log("error in pg");
      return res.status(400).json({success:false,error:err});
    throw err;
    }
      
})


router.post("/pg",async(req,res)=>{
  
     const {username,email,password,role}=req.body;

  if(username&&password&&email){
    try{
      const {data,error}=await supabase
      .from("users")
      .insert({username,email,password,role:role||'user'})
      .select(PG_SELECT)
      .single()
      if(error)throw error;
      res.status(200).json({success:true,data});

    }catch(err){
     return res.status(400).json({success:false,error:err.message});
     throw err;
    }
  }else {
    const err =new Error("username,email and password are required")
    err.status=400;
     res.status(400).json({success:false,error:err});
    throw err;
    }

});

router.put("/pg/:id",async (req,res)=>{
   const {username,email,password,role}=req.body;

  if(await isHaveUser(req.params.id)){
  try{
    const{data,error}= await supabase
      .from('users')
      .update({username,email,password,role})
      .eq('id',req.params.id)
      .select(PG_SELECT)
    if(error)throw error;
    return res.status(200).json({success:true,data});
  }catch(err){  
  
    return res.status(400).json({success:false,error:err});
    throw err;
  }}else{
    res.status(400).json({success:false,result:"user not found"});
  }
    
  })

router.delete("/pg/:id", async(req,res)=>{
 

  
  if(await isHaveUser(req.params.id)){
  try{
    
      const{data,error}= await supabase
      .from('users')
      .delete()
      .eq('id',req.params.id)
      
      
      //.select(PG_SELECT)
      if(error)throw error
      return res.status(200).json({success:true,result:"delete successfull"})
    
    
    }catch(err){
    return res.status(400).json({success:false,error:err});
     throw err;
    }
  }else{
    res.status(400).json({success:false,result:"user not found"});
  }


})