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
const { inspect } = require("util");


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
  
  try{
    const userName = req.user.displayName;
    const id = req.user.uid;


    const Busboy = require('busboy');
    const busboy = new Busboy({headers: req.headers});

    var title,desc,url;
    


    busboy.on('file', async (fieldname, file, filename) => {
      url = await compressAndUploadVideo(file,userName);
    });
    
    busboy.on('field',async (fieldname,value)=>{
      
      if(fieldname==='title'){
        title = value;
      }else{
        desc = value;
      }
      
    });

    
    busboy.on('finish', async () => {
      await MRSUploadData(url,id,userName,title,desc);
    });

    busboy.end(req.rawBody);
    res.send('success');

}catch(e){
  console.log(e);
}
 
});


//MRS
router.post('/push/to/videos', auth ,async (req,res,next)=>{
    try{  
      const id = req.user.uid;
      var refer = admin.database().ref('PENDING_VIDEOS/'+id);
    

      await refer.once('value').then((snapshot)=> {
        var data = snapshot.val();
        data.status = 'approved';
        admin.database().ref('Videos/'+id).set(data);
      });

      refer.remove();
      
      res.status(200).send('pushed to videos');
    }catch(e){
      res.status(400).send(e);
    }
});

  
//Exports
module.exports= router;