import { createClient } from "@supabase/supabase-js";

const superbaseUrl=process.env.SUPABASE_URL;
const supabaseKey=process.env.SUPABASE_SECRET_KEY;

export const supabase =createClient(superbaseUrl,supabaseKey);

export async function connectSupabase() {
    
try{
 const {error}=await supabase.from("users").select("id").limit(1);
 if(error)throw error
 console.log("supabase connected 🟢")
}catch(err){
console.error("Supabase connection error 🔴",err);
throw err;

}

}