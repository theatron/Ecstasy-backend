const admin = require('firebase-admin');
var bucket = admin.storage().bucket();
const fs = require('fs');
const functions = require('firebase-functions');



//uploading video and saving it to the database 
const compressAndUploadVideo = async (file,res) => {
  console.log('upload video')
    var metadata = {
      contentType: 'video/mp4',
    }
    
    const identifier = Math.random().toString(36).substring(7)
    const blob =  bucket.file('videos/' + identifier)
    const blobStream = blob.createWriteStream({
      metadata,
      timeout: 1000 * 60 * 60
    });

    var child_process = require('child_process');

    var args = [
      '-i', 'pipe:0',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov',
      '-vcodec', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      'pipe:1',
    ]; 
  
    const ffmpeg = child_process.spawn('ffmpeg', args);
    await file.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(blobStream);

  
    ffmpeg.on('error', function (err) {
      console.log(err);
    });

    ffmpeg.on('close', function (code) {
      console.log('ffmpeg exited with code ' + code);
    });

  

    const url = await  blob.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    })

    return url[0];
    // res.send('done the uploading');

  }

  const MRSUploadData = async (url,id,userName,title,desc) => {
    let random = Math.random().toString(36).substring(8);
    const snasphot = await admin.database().ref('USER').child(id).child("videolist").once('value')
    await admin.database().ref('PENDING_VIDEOS').child(id).child(random).set({
      title:title,
      desc:desc,
      dislikes: "0",
      id:id,
      likes: "0",
      name:userName,
      shares: "0",
      status:'pending',
      url:url,
      view: "0",
      vnum: String(snasphot.numChildren())
      
    },function(error) {
      if (error) {
        console.log('The write failed...');
      } else {
        console.log('Data saved successfully!');
      }
    });
  }

  //Pending until AI implementation 
  // const pushVideostoDB = async (req,res)=>{
  //   const id = req.user.uid;

  //   await admin.database().ref('PENDING_VIDEOS'+id).remove();
  // }

  
module.exports = {
    compressAndUploadVideo,
    MRSUploadData
}