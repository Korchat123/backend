import jwt from 'jsonwebtoken';

export const authUser=async (req,res,next)=>{
let token=req.cookies.accessToken;
 try{
if(!token)return res.status(401).json({success:false,message:"Access denied,No token"})
   
const decodedToken=jwt.verify(token,process.env.JWT_SECRET)
req.userId = decodedToken.userId;
next();
}catch(err){
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session expired' });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    next(err);
}

}
