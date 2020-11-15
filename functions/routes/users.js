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
const { runInContext } = require("vm");
const { response } = require("express");
const { sendNotification, postSilentNotification } = require('../middleware/notifications');
const { compressAndUploadVideo,MRSUploadData } = require("../config/modules");
const { parsePhoneNumber } = require('libphonenumber-js')


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

  const value = await Utils.login(userID, type, name, photourl)
  console.log(value)

  if (value == false) {
    const newType = (type == 'artist') ? 'audience' : 'artist'
    res.status(403).send(`Sorry, you are not able to login as ${type}. Please, switch to ${newType}`)
  } else {
    res.send('success')
  }

})

router.post('/profile/user-from-id', auth, (req, res) => {

  const id = req.headers.id
  if (id == undefined) {
    res.send('error')
    return
  }

  Utils.loadUser(id).then(user => res.send(user))

})
router.post('/profile', auth ,  async (req,res)=>{
  //Getting the profile with the uid
  const user = req.user
  
  Utils.loadUser(user.uid).then(user => { res.send(user) })
});

router.post('/profile/edit', auth, async (req, res) => {
  const headers = req.headers
  const name = headers.name
  const username = headers.username
  const biography = headers.bio
  const number = headers.number
  const website = headers.web
  
  const ref = admin.database().ref().child("USER").child(req.user.uid)
  
  if (name !== undefined) {
    ref.update({"name": name})
  }
  if (username !== undefined) {
    ref.update({"username": username})
  }
  if (biography !== undefined) {
    ref.update({"bio": biography})
  }
  if (website !== undefined) {
    ref.update({"web": website})
  }

  if (number !== undefined) {
    if (number !== '') {
      const result = await Utils.userFromUniversalNumber(number, req.user.uid)
    console.log(result)
    if (result.length > 0) {
      res.send('Sorry, this phonenumber is already in use')
      return
    }
    try {
      const newNumber = parsePhoneNumber(number).nationalNumber
      ref.update({"phonenumber": newNumber})
    } catch {
      ref.update({"phonenumber": number})
    }
    } else {
      ref.update({'phonenumber': ''})
    }
    
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
router.post('/profile/friend-requests', auth, async (req, res) => {
  const user = req.user
  var ref = admin.database().ref().child("USER").child(user.uid).child("friendrns")
  if (req.headers.type == "S" || req.headers.type == "R") {
    ref = ref.orderByChild('type').equalTo(req.headers.type)
  }
  const snapshot = await ref.once('value')
  const requests = snapshot
  var friends = []
  requests.forEach(request => {
    console.log(request.toJSON())
    if (request.toJSON() !== null) {
      friends.push(request)
    }
  })
  res.send(friends)
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
  console.log('deny friend')
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

//Watch video(Add view)
router.post('/profile/watch-video', auth, async (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  
  if (videoOwner == undefined || videoNumber == undefined) {
    res.send('error')
    return
  }

  const ref = admin.database().ref('USER').child(videoOwner).child('videolist').child(videoNumber)
  const snapshot = await ref.once('value')
  
  if (snapshot == null) {
    res.send('Something went wrong')
    return
  }

  const views = Number(snapshot.toJSON().view)

  ref.update({'view': String(views + 1)})

  res.send('success')
})

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

  Utils.usersFromName(text, req.user.uid).then(users => res.send(users.filter(user => user.type == "artist")))
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

router.post('/profile/videos-from-id', auth, (req, res) => {
  Utils.videosFromUser(req.user.uid).then(videos => res.send(videos))
})

router.post('/profile/videos-from-user', auth, (req, res) => {
  const userIdentifier = req.headers.user_identifier
  if (userIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.videosFromUser(userIdentifier).then(videos => res.send(videos))
})

//Share video with caption
router.post('/profile/share-video', auth, (req, res) => {
  const caption = req.headers.caption
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  const commentIdentifier = req.headers.comment_identifier
  if ((commentIdentifier !== undefined && caption !== undefined && videoOwner !== undefined && videoNumber !== undefined && caption !== '' && caption.length <= 140) == false) {
      res.send('error')
      return
  }
  Utils.shareVideo(req.user.uid, videoOwner, videoNumber, caption, commentIdentifier).then(() => res.send('success'))

})

//Load video comments
router.post('/profile/video-comments', auth, (req, res) => {
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number

  if (videoOwner == undefined || videoNumber == undefined) {
    res.send('error')
    return
  }

  Utils.loadVideoComments(videoOwner, videoNumber).then(comments => res.send(comments))
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

//Like comment
router.post('/profile/like-comment', auth, (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  const commentIdentifier = req.headers.comment_identifier
  
  if (videoOwner == undefined || videoNumber == undefined || commentIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.likeComment(user.uid, videoOwner, videoNumber, commentIdentifier)
  res.send('success')

});
//Remove comment like
router.post('/profile/remove-comment-like', auth, (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  const commentIdentifier = req.headers.comment_identifier

  if (videoOwner == undefined || videoNumber == undefined || commentIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.deleteCommentLike(user.uid, videoOwner, videoNumber, commentIdentifier)
  res.send('success')
});

//Dislike comment
router.post('/profile/dislike-comment', auth, (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  const commentIdentifier = req.headers.comment_identifier

  if (videoOwner == undefined || videoNumber == undefined || commentIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.dislikeComment(user.uid, videoOwner, videoNumber, commentIdentifier)
  res.send('success')

});
//Remove comment dislike
router.post('/profile/remove-comment-dislike', auth, (req, res) => {

  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  const commentIdentifier = req.headers.comment_identifier
  
  if (videoOwner == undefined || videoNumber == undefined || commentIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.deleteCommentDislike(user.uid, videoOwner, videoNumber, commentIdentifier)
  res.send('success')
});

//User likes comment?
router.post('/profile/likes-comment', auth, (req, res) => {
  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  const commentIdentifier = req.headers.comment_identifier
  
  if (videoOwner == undefined || videoNumber == undefined || commentIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.likesComment(user.uid, videoOwner, videoNumber, commentIdentifier).then(likes => res.send(likes))
  
});
//User dislikes comment
router.post('/profile/dislikes-comment', auth, (req, res) => {
  const user = req.user
  const videoOwner = req.headers.video_owner
  const videoNumber = req.headers.video_number
  const commentIdentifier = req.headers.comment_identifier
  
  if (videoOwner == undefined || videoNumber == undefined || commentIdentifier == undefined) {
    res.send('error')
    return
  }

  Utils.dislikesComment(user.uid, videoOwner, videoNumber, commentIdentifier).then(likes => res.send(likes))
  
});

//Video Uploading route
router.post('/profile/upload', auth , async (req,res)=>{
  
  try {
    
    var userName = req.user.displayName;
    
    const id = req.user.uid;
    
    if (userName == undefined) {
      userName = ""
    }
    
    const Busboy = require('busboy');
    const busboy = new Busboy({headers: req.headers});

    var title,desc,url;

    busboy.on('file', async (fieldname, file, filename) => {
      url = await compressAndUploadVideo(file,res);
      console.log(url);
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
      await res.status(201).send('File Uploaded');
    });

    busboy.end(req.rawBody);
    console.log('success');

}catch(e){
  console.log('error updating video', e);
}
 
});


const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, '../uploads');
  },
  filename: (req, file, cb) => {
      console.log(file);
      console.log(path.extname(file.originalname))
      cb(null, Date.now() + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png') {
      cb(null, true);
  } else {
      cb(null, false);
  }
}
const upload = multer({ storage: storage, fileFilter: fileFilter });
router.post('/profile/picture', auth, async (req, res, next) => {

  const url = await Utils.updateImage(req)
  console.log(url)
  res.send(url)

})




//MRS
router.post('/push/to/videos', auth, async (req,res) => {
    const id = req.user.uid;
    var refer = admin.database().ref('PENDING_VIDEOS/'+id);
  
    await refer.once('value').then((snapshot)=> {
      var data = snapshot.val();
      data.status = 'approved';
      const newRef = admin.database().ref('USER').child(id).child('videolist')
      newRef.once('value').then(newSnapshot => {
        newRef.child(String(newSnapshot.numChildren())).set(data);
      })

      
      
    });

    refer.remove();
    postSilentNotification(id, 'Video', 'Your video has been approved')
    sendNotification('Video', 'Your video has been approved', id)
    res.send('success')
});

router.post('/profile/all-video', auth, async(req, res) => {
  const video = await Utils.videos(req.user.uid)
  res.send(video)
})

router.post('/mrs/deny-video', auth, async (req, res) => {
  const id = req.user.uid
  const refer = admin.database().ref('PENDING_VIDEOS').child(id)
  const snapshot = await refer.once('value')
  refer.remove()
  postSilentNotification(id, 'Video', 'Your video has not been approved')
  res.send('success')
})

// router.post('/mrs/pending-video', async (req, res) => {
//   const id = req.user.uid
//   const refer = admin.database().ref('PENDING_VIDEOS').child(id)
//   const snapshot = await refer.once('value')
//   res.send(snapshot.toJSON())
// })

router.post('/mrs/pending-video', (req, res) => {
  if (req.headers.token !== '858484') {
    res.send('error')
    return
  }

  Utils.pendingVideo().then(video => res.send(video))
})

  
//Exports
module.exports = router;