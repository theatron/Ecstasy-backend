const express = require('express');
const router = express.Router();
const app = express()

router.get('/',async (req,res)=>{
  res.send('home')
})



//Register route
router.get('/register',async (req,res)=>{
   
})

//LOGIN
router.get('/login', (req,res)=>{
 
})

//LOGIN VALIDATION
router.post('/login', async function(req,res){
  
})

router.get('/profile' , async (req,res)=>{ 
    

})

router.get('/logout',async (req,res)=>{
    
})


//Exports
module.exports= router;