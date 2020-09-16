const express = require('express');
const router = express.Router();
const app = express();
const auth = require('../middleware/auth');
const firebase = require('../middleware/firebaseFunc.js');

//Routes

//Not required as of now 

//Login Route 
// router.post('/login',async (req,res)=>{
//   //login with google
//   const email = await req.body.email;
//   const password = await req.body.password;

//   const result = await firebase.admin.auth().signInWithEmailAndPassword(email,password);
//   console.log(result)
  


// })


//Profile route
router.post('/profile', auth ,  async (req,res)=>{
  //Getting the profile with the uid
    try{
      const user = req.user;
      
      console.log(user.toJSON());
  }catch(e){
      res.status(401).send();
  }

});


//Exports
module.exports= router;