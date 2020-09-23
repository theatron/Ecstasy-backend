var admin = require("firebase-admin");
const firebase = require('../middleware/firebaseFunc');
const express = require('express');
const router = new express.Router();
const formidable = require('formidable');
var bucket = firebase.admin.storage().bucket();
const fs = require('fs');
const auth = require('../middleware/auth');
const form = formidable({multiples: true});
const ffmpeg = require('fluent-ffmpeg');






//Routes


//Profile route
router.post('/profile', auth ,  async (req,res)=>{
  //Getting the profile with the uid
    try{
      const user = req.user;
      
      res.status(200).send(user);
      return user;

    }catch(e){
      res.status(401).send();
      console.log(e);
  }

});



//Video Uploading Middleware
//FFmpeg file path

router.post('/profile/upload',(req,res)=>{
  ffmpeg('./routes/tmp.mp4')
  .videoCodec('libx265')
  .outputOptions([
    '-preset veryfast',
    '-crf 28'
  ])
  .save('./routes/final.mp4');
  
});
  

  
//Exports
module.exports= router;