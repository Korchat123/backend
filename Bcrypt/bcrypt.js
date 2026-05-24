import bcrypt, { hash } from "bcrypt";
const samplePassword="I_test_Hash"
const saltRound=10;
export const hashing = async (string,salt)=>{
const hashedPass=bcrypt.hash(string,salt)
return hashedPass;

}

const hashhash=await hashing(samplePassword,saltRound);
console.log(hashhash)
console.log(await bcrypt.compare(samplePassword,hashhash))