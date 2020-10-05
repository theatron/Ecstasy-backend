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
const { Utils } = require('../middleware/utils')
const { resourceUsage } = require("process");
const { ESRCH } = require("constants");


//Routes


//Profile route
router.post('/profile', auth ,  async (req,res)=>{
  //Getting the profile with the uid
  const user = req.user
  
  Utils.loadUser(user.uid).then(user => { res.send(user) })
  //   try{
  //     const user = req.user;
  //     //loadUser(user.uid)
  //       //.then(user => { res.status(200).send(user) })
  //     res.status(200).send(user)
  //     return user;

  //   }catch(e){
  //     res.status(401).send();
  //     console.log(e);
  // }

});

router.post('/profile/edit', auth, (req, res) => {
  const headers = req.headers
  const name = headers.name
  const username = headers.username
  const biography = headers.biography
  const number = headers.phonenumber
  const website = headers.website
  
  const ref = admin.database().ref().child("USER").child(req.user.uid)
  
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
});

//Load possible friends from number
router.post('/profile/can-be-friends', auth, (req, res) => {
  const numbersRaw = req.headers.phonenumbers
  if (numbersRaw == undefined) {
    res.send('error')
    return
  }
  
  const numbers = numbersRaw.trim().split(",")
  
  const id = req.user.uid

  Utils.cannotBeFriends(id).then(identifiers => {
    Utils.usersFromNumbers(identifiers, numbers).then(users => { res.send(users) })
  })
  

  
});
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
      Utils.loadUsers(identifiers).then(users => { res.send(users) })
    })
});

//Delete friend
router.post('/profile/delete-friend', auth, (req, res) => {
  const friendIdentifier = req.headers.friend
  if (friendIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.deleteFriend(req.user.uid, friendIdentifier)
  res.send('success')

});

//Load friend requests
router.post('/profile/friend-requests', auth, (req, res) => {
  const user = req.user
  var ref = admin.database().ref().child("USER").child(user.uid).child("friendrns")
  if (req.headers.type == "S" || req.headers.type == "R") {
    ref = ref.orderByChild('type').equalTo(req.headers.type)
  }
  ref.once('value')
    .then(snapshot => {
      const requests = snapshot.val()
      res.send(requests)
    })
});

//Send friend request
router.post('/profile/be-friend', auth, (req, res) => {
  const user = req.user
  
  const friendIdentifier = req.headers.friend
  if (friendIdentifier == undefined) {
    res.send('error')
    return
  }
  Utils.sendFriendRequest(user.uid, friendIdentifier).then(friend => { res.send(friend) })
  
});

//Accept friend request
router.post('/profile/accept-friend', auth, (req, res) => {
  const friendIdentifier = req.headers.friend
  if (friendIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.acceptFriendRequest(req.user.uid, friendIdentifier).then(() => { res.send('success') })
});

//Deny friend request
router.post('/profile/deny-friend', auth, (req, res) => {
  const friendIdentifier = req.headers.friend
  if (friendIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.denyFriendRequest(req.user.uid, friendIdentifier).then(() => { res.send('success') })
});

//Thumbnail
router.post('/profile/thumbnail', auth, (req, res) => {

    const user = req.user
    Utils.loadThumbnail(user.uid).then(videos => res.send(videos))

});

//Like video
router.post('/profile/like-video', auth, (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  
  if (videoOwner == undefined || videoNumber == undefined) {
    res.send('error')
    return
  }

  Utils.likeVideo(user.uid, videoOwner, videoNumber)
  res.send('success')

});
//Remove video like
router.post('/profile/remove-video-like', auth, (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  
  if (videoOwner == undefined || videoNumber == undefined) {
    res.send('error')
    return
  }

  Utils.deleteVideoLike(user.uid, videoOwner, videoNumber)
  res.send('success')
});

//Dislike video
router.post('/profile/dislike-video', auth, (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  
  if (videoOwner == undefined || videoNumber == undefined) {
    res.send('error')
    return
  }

  Utils.dislikeVideo(user.uid, videoOwner, videoNumber)
  res.send('success')

});
//Remove video dislike
router.post('/profile/remove-video-dislike', auth, (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  
  if (videoOwner == undefined || videoNumber == undefined) {
    res.send('error')
    return
  }

  Utils.deleteVideoDislike(user.uid, videoOwner, videoNumber)
  res.send('success')
});

//User likes video?
router.post('/profile/likes-video', auth, (req, res) => {
  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  
  if (videoOwner == undefined || videoNumber == undefined) {
    res.send(false)
    return
  }
  Utils.likesVideo(user.uid, videoOwner, videoNumber).then(likes => res.send(likes))
  
});
//User dislikes video
router.post('/profile/dislikes-video', auth, (req, res) => {
  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  
  if (videoOwner == undefined || videoNumber == undefined) {
    res.send(false)
    return
  }
  Utils.dislikesVideo(user.uid, videoOwner, videoNumber).then(likes => res.send(likes))
  
});

//Users from name
router.post('/profile/users-from-name', auth, (req, res) => {
  const text = req.headers.text
  
  if (text == undefined) {
    res.send('error')
    return
  }

  Utils.usersFromName(text).then(users => res.send(users.filter(user => user.type == "artist")))
});

//Admire user
router.post('/profile/admire', auth, (req, res) => {

  const admireIdentifier = req.headers.user
  if (admireIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.admire(req.user.uid, admireIdentifier).then(() => res.send('success'))

});

router.post('/profile/remove-admire', auth, (req, res) => {

  const admireIdentifier = req.headers.user
  if (admireIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.removeAdmire(req.user.uid, admireIdentifier).then(() => res.send('success'))
  
});

router.post('/profile/videos-from-name', auth, (req, res) => {
  const text = req.headers.text
  
  if (text == undefined) {
    res.send('error')
    return
  }

  Utils.videosFromName(text, req.user.uid).then(videos => res.send(videos))
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