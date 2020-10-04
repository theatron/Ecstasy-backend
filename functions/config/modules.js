const admin = require('firebase-admin');
var bucket = admin.storage().bucket();
const fs = require('fs');

const compressVideo = async (req,res,next,files,filename) => {
    console.log('start');
    const { spawn } = require('child_process');

    var cmd = 'ffmpeg';
    var args = [
      '-i', 'pipe:0',
      '-vcodec', 'libx265', 
      '-preset', 'veryfast',
      '-crf', '28',
      'pipe:1'
    ];
    
    
    var proc = await spawn(cmd, args);
    files.pipe(proc);
    proc.stdout.on('data', async function(data) {
      console.log(data);
 
  });
  
    proc.stderr.on('error', function(err) {
      console.log(err);
    });
  
    proc.on('close', function() {
      console.log('finished');
      next()
    });
  
  }


  
const getPublicUrl = (filename) => {
    return `https://storage.googleapis.com/${bucket.name}/videos/${filename}`;
  }





module.exports = {
    compressVideo,
    getPublicUrl,
}
