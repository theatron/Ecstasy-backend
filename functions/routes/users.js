var admin = require("firebase-admin");
require('../middleware/firebaseFunc');
const functions = require('firebase-functions');
const express = require('express');
const router = new express.Router();
var bucket = admin.storage().bucket();
const fs = require('fs');
const auth = require('../middleware/auth');
const os = require('os');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { compressAndUploadVideo,MRSUploadData } = require("../config/modules");


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


//Video Uploading route
router.post('/profile/upload', auth , (req,res)=>{

  const userName = req.user.displayName;
  const id = req.user.uid;
  const title = req.title;
  const desc = req.desc;

  console.log(userName,id);
  const Busboy = require('busboy');
  const busboy = new Busboy({headers: req.headers});

  


  busboy.on('file', async (fieldname, file, filename) => {
    const url = await compressAndUploadVideo(file,userName);

    console.log(url);
    await MRSUploadData(url,id,userName,title,desc);
   
    console.log('data added');
    
});
    
      
  // Triggered once all uploaded files are processed by Busboy.
  // We still need to wait for the disk writes (saves) to complete.
  busboy.on('finish', async () => {
    console.log('upload done');
  });

  busboy.end(req.rawBody);
  res.send('success');
 
});



  
//Exports
module.exports= router;