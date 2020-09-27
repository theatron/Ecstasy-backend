var admin = require("firebase-admin");
const firebase = require('../middleware/firebaseFunc');
const functions = require('firebase-functions');
const express = require('express');
const router = new express.Router();
var bucket = firebase.admin.storage().bucket();
const fs = require('fs');
const auth = require('../middleware/auth');
const os = require('os');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { database } = require("firebase-admin");
const { equal } = require("assert");
const { user } = require("firebase-functions/lib/providers/auth");
const { loadUsers, loadUser } = require("../middleware/utils");
const { resourceUsage } = require("process");
const { ESRCH } = require("constants");


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

router.post('/profile/edit', auth, (req, res) => {
  const headers = req.headers
  const name = headers.name
  const username = headers.username
  const biography = headers.biography
  const number = headers.phonenumber
  const website = headers.website
  
  const ref = admin.database().ref().child("USER").child(req.user.uid)
  console.log(req.user)
  if (name != undefined) {
    ref.update({"name": name})
  }
  if (username != undefined) {
    ref.update({"username": username})
  }
  if (biography != undefined) {
    ref.update({"bio": biography})
  }
  if (number != undefined) {
    ref.update({"phonenumber": number})
  }
  if (website != undefined) {
    ref.update({"web": website})
  }

  res.send('success')
})

//Load friends
router.post('/profile/friends', auth, (req, res) => {
  const user = req.user
  const ref = admin.database().ref().child("USER").child(user.uid).child("friends")
  ref.once('value')
    .then(snapshot => {
      const friends = snapshot.val()
      if (friends == undefined) {
        res.send([])
        return
      }
      //Extract friends' identifier
      const identifiers = friends.map(value => value.id)
      //Load updated users by identifier
      loadUsers(identifiers).then(users => { res.send(users) })
    })
})


  router.post('/profile/upload', auth , (req,res)=>{
    // req.get('Content-Type');

    // if (!content-type.startsWith('video/mp4')) {
    //   console.log('This is not an audio.');
    //   return null;
    // }
    const userName = req.user.displayName;

    const Busboy = require('busboy');
    
    const busboy = new Busboy({headers: req.headers});
    const tmpdir = os.tmpdir();

    // This object will accumulate all the fields, keyed by their name
    const fields = {};

    // This object will accumulate all the uploaded files, keyed by their name.
    const uploads = {};

    // This code will process each non-file field in the form.
    busboy.on('field', (fieldname, val) => {
      // TODO(developer): Process submitted field values here
      console.log(`Processed field ${fieldname}: ${val}.`);
      fields.fieldname = val;
    });


    // This code will process each file uploaded.
    busboy.on('file', (fieldname, file, filename) => {
      var metadata = {
        contentType: 'video/mp4',
      }


      console.log(`Processed file ${filename}`);
      const filepath = path.join(tmpdir, filename);
      const outputFilePath = path.join(tmpdir,'op'+filename);
      uploads.fieldname = filepath;
      uploads.file = outputFilePath;
      
      
      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);
      

        ffmpeg(filepath)
        .videoCodec('libx265')
        .outputOptions([
          '-preset veryfast',
          '-crf 28'
        ]).save(outputFilePath);

        
        
    
          bucket.upload(outputFilePath, {
            destination: 'videos/'+userName+Date.now(),
            metadata: metadata
  
          }).then(() => {
            console.log('done');
          }).catch(err => {
            console.error('ERROR:', err.message);
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

    
    
     
     
      //Use Compression with ffmpeg binary
  // var exec = require('child_process').exec;
  // var cmd = 'ffmpeg -i '+filePath+' -vcodec libx265 -preset veryfast -crf 28 veryfast.mp4';

  // exec(cmd, function(error, stdout, stderr) {
  // console.log('success');
  // })

});


  

  
//Exports
module.exports= router;