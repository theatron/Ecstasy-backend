const admin = require('firebase-admin');
var bucket = admin.storage().bucket();
const fs = require('fs');
const { title } = require('process');



//uploading video and saving it to the database 
const compressAndUploadVideo = async (file,userName) => {
    var metadata = {
      contentType: 'video/mp4',
    }
    
    const blob =  bucket.file('videos/'+userName);
    const blobStream = blob.createWriteStream({
      metadata
    });

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
    await file.pipe(ffmpeg.stdin);
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

    const url = await  blob.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    })

    return url[0];

  }


  const MRSUploadData = async (url,id,userName,title,desc)=>{
    await admin.database().ref('PENDING_VIDEOS/'+id).set({
      title:title,
      desc:desc,
      dislikes:0,
      id:id,
      likes:0,
      name:userName,
      shares:0,
      status:'pending',
      url:url,
      view:0
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
