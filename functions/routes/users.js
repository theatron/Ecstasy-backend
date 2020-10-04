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
// const { compressVideo } = require("../config/modules");


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


router.post('/profile/upload', auth , (req,res)=>{

  var metadata = {
    contentType: 'video/mp4',
  }

  const userName = req.user.displayName;

  const Busboy = require('busboy');
  
  const busboy = new Busboy({headers: req.headers});

  const blob = bucket.file('videos/'+userName+Date.now());
  const blobStream = blob.createWriteStream({
    metadata
  });


  busboy.on('file', async (fieldname, file, filename) => {
    var child_process = require('child_process');

    var args = [
      '-i', 'pipe:0',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov',
      '-vcodec', 'libx265',
      '-preset', 'veryfast',
      '-crf', '28',
      'pipe:1',
    ]; 
    
    const ffmpeg = child_process.spawn('ffmpeg', args);
    file.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(blobStream);

   
    ffmpeg.on('error', function (err) {
      console.log(err);
  });
  
  ffmpeg.on('close', function (code) {
      console.log('ffmpeg exited with code ' + code);
  });
  
  ffmpeg.stderr.on('data', function (data) {
      // console.log('stderr: ' + data);
      var tData = data.toString('utf8');
      // var a = tData.split('[\\s\\xA0]+');
      var a = tData.split('\n');
      console.log(a);
  });
  
  ffmpeg.stdout.on('data', function (data) {
      var frame = new Buffer(data).toString('base64');
      // console.log(frame);
  });

    
});
    
      

    res.send('success');

  // Triggered once all uploaded files are processed by Busboy.
  // We still need to wait for the disk writes (saves) to complete.
  busboy.on('finish', async () => {
    console.log('upload done');
  });

  busboy.end(req.rawBody);
  console.log('File uploaded');

 
});

  

  
//Exports
module.exports= router;