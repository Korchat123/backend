import { json, Router } from "express";
import { products } from "../../mockdata/fakePoduct";
export const router = Router();

router.get("/",(req,res)=>{
    res.json(products);


})
router.put("/:id",(req,res)=>{
    
    

})
router.post("/",(req,res)=>{



})
router.delete("/:id",(req,res)=>{



})