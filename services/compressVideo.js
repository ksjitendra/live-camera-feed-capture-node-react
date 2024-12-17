const path = require('path')
const videoFolderPath = path.join(__dirname, '../public/compressed_videos');
const inputVideoFolderPath = path.join(__dirname, '../public/videos');
const ffmpeg = require('fluent-ffmpeg');
const { uploadingVideo } = require("./storeVideo")
const fs = require("fs")
const { EventEmitter } = require('events');
const AWS = require('aws-sdk'); 
const { log } = require('console');

// Creating s3 client 
const s3Client = new AWS.S3({
  region: 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

});

// Compressing s3 Video 
const compressS3Video = async (fileName, socketId, io) => {

  // const fileName = req.params.fileName
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName,
  };

  const file = path.join(inputVideoFolderPath, fileName)
  try {
    const data = await new Promise((resolve, reject) => {
      s3Client.getObject(params, async (err, data) => {
        if (err) {
          console.error('Error downloading file from S3:', err);
          reject(err);
        } else {
          const writableStream = fs.createWriteStream(file);
          await writeDataToStream(writableStream, data.Body)
            .then(() => {
              console.log("Got file from s3");
              resolve(data);
            })
            .catch((writeError) => {
              console.error('Error writing data to stream:', writeError);
              reject(writeError);
            });
        }
      });
    });

    // File has been successfully downloaded and written, now you can compress it.
    compressVideo(fileName, socketId, io)
    // Continue with other operations as needed.
  } catch (error) {
    // Handle any errors that occurred during the process.
    console.error('An error occurred:', error);
  }

}

const  writeDataToStream = (writableStream, data) => {

  return new Promise((resolve, reject) => {
    try {

      writableStream.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
      
    } catch (error) {
      reject(error)
    }
    
  });
}


// Function is to compress video after completing the stream.
const compressVideo = (inputFile, socketId, io) => {

  try {
    console.log('Video Compression function called', inputFile);
    const inputPath = path.join(inputVideoFolderPath, inputFile)

    const prefix = "compressed_";
    const fileName = `${prefix}${inputFile}`

    console.log(fileName, "fileName in video compression");
    const outputPath = path.join(videoFolderPath, fileName)
  
      // Create an ffmpeg command
      ffmpeg(inputPath)
        .videoCodec('libx264')  // video compressed by libx264 are working fine 
        .audioCodec('aac')                     
        .output(outputPath)    
        .on('end', () => {

          fs.stat(outputPath, (err, stats) => {
            if (err) {
              console.error(`Error reading file: ${err}`);
            } else {
              const fileSizeInBytes = stats.size;
              const fileSizeInKilobytes = fileSizeInBytes / 1024;
              const fileSizeInMegabytes = fileSizeInKilobytes / 1024;

              const fileSize = fileSizeInMegabytes.toFixed(2)
          
              console.log(`File size in megabytes: ${fileSizeInMegabytes}`);
              io.to(socketId).emit("compressVideoSize", {data: fileSize})
              
            }
        });

          console.log('Video compression finished.');
          // Calling service to store video on s3
          const videoUpload = uploadingVideo(fileName, io, socketId);
        })
        .run();
    
  } catch (error) {
    console.log("Issue getting in Video compression!");
    console.log(error.message);
  }
}



// Function to compressing any specific Video any calling endpoint
const videoCompress = (req, res) => {
  try {
    console.log('Video Compression function called');
    // // Input video file path
    const inputFile = 'ioAUCulC_-7af_VYAAAB_1695708838293.mp4'
    const inputPath = path.join(inputVideoFolderPath, inputFile)
  
    // Output video file path
    const fileName = "new__video.mp4"
    const outputPath = path.join(videoFolderPath, fileName)
    
      // Create an ffmpeg command
      ffmpeg(inputPath)
        .videoCodec('libx264') // Specify the video codec for compression // libx265 libvpx-vp9 -- developer by google , libaom-av1 
        .audioCodec('aac')     // Specify the audio codec                     
        .output(outputPath)    // .size('640x?')         // Set the desired video size (width: 640 pixels, maintain aspect ratio)
        .on('end', () => {

          console.log('Video compression finished.');
          return res.status(200).json({
            message: "Video has compressed!"
          })


        })
        .run();    
  } catch (error) {

    console.log("Issue getting in Video compression!");
    console.log(error.message);

   return  res.status(413).json({
      message: error.message
    })

}
}


module.exports = {compressVideo, videoCompress, compressS3Video}
