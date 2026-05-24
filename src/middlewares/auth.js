import jwt from 'jsonwebtoken';

export const authUser=async (req,res,next)=>{
let token=req.cookies.accessToken;
 try{
if(!token)return res.status(401).json({success:false,message:"Access denied,No token"})
   
const decodedToken=jwt.verify(token,process.env.JWT_SECRET)
req.userId = decodedToken.userId;
next();
}catch(err){
    next(err);
}

}