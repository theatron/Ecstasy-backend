const firebase = require('../middleware/firebaseFunc.js');
const express = require('express');
const router = express.Router();
const app = express();
const formidable = require('formidable');
const fs = require('fs');
var bucket = firebase.admin.storage().bucket();
const auth = require('../middleware/auth');


//Routes




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



//Profile picture
router.post('/profile/me', auth , (req,res)=>{

  const form = formidable({ multiples: true });
  
  form.parse(req, (err, fields, files) => {
    console.log(files);
    if (err) {
      next(err);
      console.log(err);;
    }

    var metadata = {
      contentType: 'image/jpeg',
    }
    
    bucket.upload(files.avatar.path, {
      destination: 'profileImages/'+files.avatar.name+Date.now(),
      metadata: metadata
  
    }).then(() => {
      res.status(200).send();
    }).catch(err => {
      console.error('ERROR:', err.message);
    });
  });

  
  res.status(200).send();


},(error,req,res)=>{
    res.status(400).send({'error': error.message})
});


//Exports
module.exports= router;