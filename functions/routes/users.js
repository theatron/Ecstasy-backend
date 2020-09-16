const firebase = require('../middleware/firebaseFunc.js');
const express = require('express');
const router = express.Router();
const app = express();
const multer = require('multer');
// const bucket = firebase.admin.storage('/profileImages');
const auth = require('../middleware/auth');


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
      
      res.status(200).json(user);

    }catch(e){
      res.status(401).send();
      console.log(e);
  }

});

// multer

// const upload = multer({dest: bucket});

// //Profile picture
// router.post('/profile/me', auth ,upload.single('avatar') ,async (req,res)=>{
//   res.status(200).send();

// });


//Exports
module.exports= router;