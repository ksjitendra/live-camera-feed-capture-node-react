const fs = require('fs');
const path = require('path');
const range = require('range-parser');
const AWS = require('aws-sdk'); 


const client = new AWS.S3({
  region: 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

});

const videoFolderPath = path.join(__dirname, '../public/compressed_videos'); // Update the path to your videos folder

const streamVideo = ((req, res) => {


  // console.log('videoPath', videoPath);

  // Check if the video file exists
  // if (!fs.existsSync(videoPath)) {
  //   return res.status(404).send('Video not found');
  // }

  try {

    const range = req.headers.range;
  if (!range) {
    res.status(400).send("Requires Range header");
  }

  // get video stats (about 61MB)
  // const videoPath = "bigbuck.mp4";
  // const videoSize = fs.statSync("bigbuck.mp4").size;

  const videoName = "47__user.mp4"
  const videoPath = path.join(videoFolderPath, videoName);
  const videoSize = fs.statSync(videoPath).size;



  // Parse Range
  // Example: "bytes=32324-"
  const CHUNK_SIZE = 10 ** 6; // 1MB
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

  // Create headers
  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };

  // HTTP Status 206 for Partial Content
  res.writeHead(206, headers);

  // create video read stream for this particular chunk
  const videoStream = fs.createReadStream(videoPath, { start, end });

  // Stream the video chunk to the client
  videoStream.pipe(res);

  console.log(res);




    // const videoStat = fs.statSync(videoPath);
    // const fileSize = videoStat.size;
    // const rangeHeader = req.headers.range || 'bytes=0-';
  
    // // Define a simple range parsing function
    // function parseRange(rangeHeader, fileSize) {
    //   const parts = rangeHeader.replace(/bytes=/, '').split('-');
    //   const start = parseInt(parts[0], 10);
    //   const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    //   return [start, end];
    // }
  
    // const [start, end] = parseRange(rangeHeader, fileSize);
  
    // const headers = {
    //   'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    //   'Accept-Ranges': 'bytes',
    //   'Content-Length': end - start + 1,
    //   'Content-Type': 'video/mp4', // Update with the appropriate content type
    // };
  
    // res.writeHead(206, headers);
  
    // const videoStream = fs.createReadStream(videoPath, { start, end });
  
    // videoStream.pipe(res);

  } catch (error) {

    console.log('error', error.message);
    return res.status(413).json({
      message: error.message
    });
  }
  

//   try {

//     const videoStat = fs.statSync(videoPath);
//     const fileSize = videoStat.size;
//     const rangeHeader = req.headers.range || 'bytes=0-';
  
//     const positions = range(rangeHeader, fileSize);
//     const start = positions[0].start;
//     const end = positions[0].end || fileSize - 1;
  
//     const headers = {
//       'Content-Range': `bytes ${start}-${end}/${fileSize}`,
//       'Accept-Ranges': 'bytes', 
//       'Content-Length': end - start + 1,
//       'Content-Type': 'video/mp4', // Update with the appropriate content type
//     };
  
//     res.writeHead(206, headers);
  
//     const videoStream = fs.createReadStream(videoPath, { start, end });
  
//     videoStream.pipe(res);
    
//   } catch (error) {
    
//      return res.status(413).json({
//         message: error.message
//      })
//   }

 
});

const getVideo = (req, res) => {

  try {

    const videoKey = req.params.videoName;

    const params = {
      Bucket: 'ride4h-poc',
      Key: videoKey,
    };
  
    const s3 = new AWS.S3();
  
    s3.headObject(params, (err, data) => {
      if (err) {
        console.error(err);
        return res.status(404).end();
      }
  
      const fileSize = data.ContentLength;
      const range = req.headers.range;
  
      if (range) {
        // Video streaming with partial content
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
  
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4', // Adjust the content type as needed
        };
  
        res.writeHead(206, headers);
  
        const videoStream = s3.getObject(params).createReadStream({ Range: `bytes=${start}-${end}` });
        videoStream.pipe(res);
      } else {
        // Regular download if range header is not present
        const headers = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4', // Adjust the content type as needed
        };
  
        res.writeHead(200, headers);
  
        const videoStream = client.getObject(params).createReadStream();
        videoStream.pipe(res);
      }
    });
    
  } catch (error) {

    return res.status(413).json({
      message: error.message
    })
    
  }

 

}


const streamLocalVide = (req, res)=> {

  try {

      const range = req.headers.range
      console.log(range, "range");
      console.log(range.replace('/\D/g', ""));
      if(!range) {
          res.status(413).json({
              message: "Please send a range"
          })
      }

      const videoPath = path.join(__dirname, "66__user.mp4")
      const videoSize = fs.statSync(videoPath).size

      const CHUNK_SIZE = 10**6 // 1MB
      const start = Number(range.replace(/\D/g, "")); 
      const end = Math.min(start+ CHUNK_SIZE , videoSize-1)

      const contentLength = end-start+1

      const headers = {
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
          "Accept-Ranges": 'bytes',
          "Content-Length": contentLength,
          "Content-Type": "video/mp4"

      }

      res.writeHead(206, headers)
      const videoStream = fs.createReadStream(videoPath, {start, end})
      videoStream.pipe(res);
      
  } catch (error) {

      console.log(error, error.message);
      
  }   
}

module.exports = {streamVideo, getVideo}

