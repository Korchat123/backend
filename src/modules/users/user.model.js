import mongoose from "mongoose";

const userSchema=mongoose.Schema(
    {
        username: { type:String,required: true,trim: true,unique:true},
        role:{type:String,enum:["user","admin"],default:"user"},
        email:{type:String,required:true,unique:true,lowercase:true},
        password:{type:String,required: true,minlength:8,select:false}

    },{timestamps:true}

)

export const User=mongoose.model("User",userSchema);