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
router.post('/login', auth, async(req, res) => {

  const userID = req.user.uid
  const name = req.headers.name
  const type = req.headers.type
  var photourl = req.headers.photourl
  if (photourl == undefined) {
    photourl = ''
  }

  if ((name != undefined && type != undefined && (type == 'artist' || type == 'audience')) == false) {
    res.send('error')
  }

  Utils.login(userID, type, name, photourl).then(() => res.send('success'))

})
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

//Remove admire
router.post('/profile/remove-admire', auth, (req, res) => {

  const admireIdentifier = req.headers.user
  if (admireIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.removeAdmire(req.user.uid, admireIdentifier).then(() => res.send('success'))
  
});

//Search videos by name
router.post('/profile/videos-from-name', auth, (req, res) => {
  const text = req.headers.text
  
  if (text == undefined) {
    res.send('error')
    return
  }

  Utils.videosFromName(text, req.user.uid).then(videos => res.send(videos))
})

//Share video with caption
router.post('/profile/share-video', auth, (req, res) => {
  const caption = req.headers.caption
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  if ((caption !== undefined && videoOwner !== undefined && videoNumber !== undefined && caption !== '' && caption.length <= 140) == false) {
      res.send('error')
      return
  }
  Utils.shareVideo(req.user.uid, videoOwner, videoNumber, caption).then(() => res.send('success'))

})

//Reply to comment
router.post('/profile/reply-to-comment', auth, (req, res) => {
  const caption = req.headers.caption
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  const commentIdentifier = req.headers.comment_identifier
  if ((caption !== undefined && videoOwner !== undefined && videoNumber !== undefined && commentIdentifier !== undefined && caption !== '' && caption.length <= 140) == false) {
      res.send('error')
      return
  }
  Utils.replyToComment(req.user.uid, videoOwner, videoNumber, commentIdentifier, caption).then(() => res.send('success'))
})


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