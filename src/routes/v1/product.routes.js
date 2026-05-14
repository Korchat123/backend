import { json, Router } from "express";
import { products } from "../../mockdata/fakePoducts.js";
export const router = Router();

router.get("/",(req,res)=>{
    res.json(products);


})
router.put("/:id",(req,res)=>{
    const product=products.find((e)=>(e.id===parseInt(req.params.id)))
    if(product){

            if(req.body.name&&req.body.description){
                product.name=req.body.name;
                product.description=req.body.description;
            }else{
                return(res.send('no Productname or description'))
            }
    }else{return(res.send('cant find product'))}

    res.status(200).json(product);
        
    

})
router.post("/",(req,res)=>{
    const{name,description}=req.body;
    if(name&&description)
     {  
        const id=products.length+1;
        const product={id,name,description};   
        products.push(product);
        res.status(200).json(product)
     }else{
        res.send('data uncomplete pls check name and description')
     }

})
router.delete("/:id",(req,res)=>{
    const id=parseInt(req.params.id);
    // products=products.filter((e)=>{e.id!=id})
  
    

      //  console.log(product)
        if(req.params.id&&products)
        {products.splice(id-1,1);
        res.status(200).json(products);}
    else{res.send('cant find product')}
   

})