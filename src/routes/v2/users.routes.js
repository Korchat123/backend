import { Router } from "express";


export const router=Router();

router.get("/",(req,res)=>{
         res.json(users); 

})

router.put("/",(req,res)=>{

    let isHave=false;
    const newUsers= users.filter((e)=>{
      if (e.id===req.body.id&&req.body.username&&req.body.email&&req.body.password)
        {
          isHave=true;  
           e.username=req.body.username;
           e.email=req.body.email;
           e.password=req.body.password;
        }
        return(true)
    })
     if(isHave){
        console.log(newUsers);
        res.status(200).json('update users success')

     }
     else{
      console.log("not have this user")
     return res.status(404).json('Not fond this user');
    }

});

router.post("/",(req,res)=>{
  
  const id=(users.reduce((max, u) => Math.max(max, Number(u.id)), 0) || 0) + 1;
  
  if(req.body.username&&req.body.password){
    console.log(req.body.id);
    users.push({"id":id,...req.body});
    console.log(users);

    res.status(201).json('add users success')
  }else res.status(400).json({error:'Username is require'});
});

router.delete("/:id",(req,res)=>{
   // console.log(req.params.id);
    const myId=req.params.id;
    console.log(myId);

     let isHave=false;
    const newUsers= users.filter((e)=>{
   if (e.id===myId){isHave=true; return(false);}else return(true);
    })
     if(isHave){
      res.status(200).json('delete users success')
        console.log(newUsers);
     }else{
        console.log("not have this user")
      }
});