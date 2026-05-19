import { User } from "./user.model.js";
export const getUsers=async (req,res)=>{
    try{
     const users=await User.find();
     return res.status(200).json({success:true,data:users});
    }catch(err){
      return res.status(400).json({success:false,error:err});
    }
}
export const updateUser = async(req,res)=>{
try{
  const doc=await User.findByIdAndUpdate(req.params.id,{ $set: req.body },{runValidators:true,returnDocument:'after'})
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
export const deleteUser=async(req,res)=>{

  try{
  const doc=await User.findByIdAndDelete(req.params.id)
if(!doc){return res.status(404).json({error:"user not found"})}
  return res.status(200).json({success:true,data:userResponse(doc)});
}catch(err){
return res.status(400).json({error:err.message})}



}