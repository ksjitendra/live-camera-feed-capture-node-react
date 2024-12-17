const AWS = require('aws-sdk'); 
const fs = require('fs')
const path = require('path')
const compressVideoPath = path.join(__dirname, '../public/compressed_videos');

const s3Client = new AWS.S3({
  region: 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

});

// Uploading Video on s3 after compression, function is geting called after compression of video 
const uploadingVideo = (inputFile, io, socketId) => {
  try {
    const bucketName = process.env.S3_BUCKET_NAME
    const fileName = path.join(compressVideoPath, inputFile)
    const fileData = fs.readFileSync(fileName);
    
    const result = s3Client.upload({
        Bucket: bucketName,
        Key: inputFile,
        Body: fileData,
        ContentType: "video/mp4",
    }, (error, data) => {
        if (error) {
        console.error(error);

        const errorObj = {
          message: "Getting trouble in saving video",
          error: error.message
        }

        return errorObj;

        } else {
          console.log(`File uploaded successfully. ${data.Location}`);
          io.to(socketId).emit("compressed_video_link", {data: data.Location})
            return "Video is uploaded successfully";
        }
    });
  
} catch (error) {

    const errorObj = {
      message: "Getting trouble in saving video",
      error: error.message
  }

  return errorObj;
}

}

// function to store any specific video on s3 using enpoint
const uploadVideo = (req, res) => {

    try {
        const bucketName = 'ride4h-poc';
        const inputFile = 'new__video.mp4'
        const fileName = path.join(compressVideoPath, inputFile)
        const fileData = fs.readFileSync(fileName);
        
        const result = s3Client.upload({
            Bucket: bucketName,
            Key: inputFile,
            Body: fileData,
            ContentType: "video/mp4",
        }, (error, data) => {
            if (error) {
            console.error(error);

            res.status(413).json({
                message: "Getting trouble in saving video",
                error: error.message
            })

            } else {
                res.status(200).json({
                    message: "Video is uploaded successfully",
                    // data,

                })
            console.log(`File uploaded successfully. ${data.Location}`);
            }
        });
        
    } catch (error) {

        res.status(413).json({
            message: "Getting trouble in saving video",
            error: error.message
        })
        
    }
}

module.exports = {uploadVideo, uploadingVideo}