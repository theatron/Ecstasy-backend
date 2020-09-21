var admin = require("firebase-admin");
const firebase = require('../middleware/firebaseFunc');
const express = require('express');
const router = new express.Router();
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const formidable = require('formidable');
const fs = require('fs');
var bucket = firebase.admin.storage().bucket();
const auth = require('../middleware/auth');



//    *******************
//    M I D D L E W A R E
//    *******************

router.use(cors({ origin: true }))

//express parsing json
router.use(express.json())

//Cookie parser
router.use(cookieParser());

//Body Parser

// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({ extended: false }));
 
// parse application/json
router.use(bodyParser.json());

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
      destination: 'profileImages/'+req.user.displayName+Date.now(),
      metadata: metadata

    }).then(() => {
      res.status(200).send();
    }).catch(err => {
      console.error('ERROR:', err.message);
    });
  });
    
});



//Video Uploading Middleware

  
//Exports
module.exports= router;