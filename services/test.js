const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer((req, res) => {
  // Handle HTTP requests (if needed)
});

const io = socketIo(server);

io.on('connection', (socket) => {
  console.log('A client connected');

  // Specify the path to your video file
  const videoFilePath = 'path/to/your/video.mp4';

  // Create a write stream to append data to the video file
  const writeStream = fs.createWriteStream(videoFilePath, { flags: 'a' });

  socket.on('dataChunk', (data) => {
    // Append the received data chunk to the video file
    writeStream.write(data);

    // Optionally, you can send an acknowledgment back to the client
    socket.emit('ack', { message: 'Chunk received and appended' });
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected');
    writeStream.end(); // Close the write stream when the client disconnects
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});


// array buffer function 
const blob = ... // Your Blob object

// Convert Blob to ArrayBuffer
blob.arrayBuffer().then((arrayBuffer) => {
  // Now you can work with the ArrayBuffer
  console.log(arrayBuffer);
}).catch((error) => {
  console.error(error);
});




const express = require('express');
const app = express();
const bodyParser = require('body-parser');

// Middleware to parse incoming JSON data
app.use(bodyParser.json());

// Handle POST request with Blob data
app.post('/upload', (req, res) => {
  // Assuming you receive the Blob in the request body
  const blobData = req.body;

  // Convert Blob to ArrayBuffer
  blobToBuffer(blobData)
    .then(arrayBuffer => {
      // You can now work with the ArrayBuffer
      // For example, you can send it as a response
      res.send(arrayBuffer);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Error converting Blob to ArrayBuffer');
    });
});

// Function to convert Blob to ArrayBuffer
function blobToBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



const express = require('express');
const app = express();
const AWS = require('aws-sdk');

app.get('/stream/:videoName', (req, res) => {
  const videoKey = req.params.videoName;

  const params = {
    Bucket: 'your-s3-bucket-name',
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

      const videoStream = s3.getObject(params).createReadStream();
      videoStream.pipe(res);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


const WebSocket = require('ws');
const AWS = require('aws-sdk');
const fs = require('fs');

// Set up AWS credentials and S3 instance
AWS.config.update({
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  region: 'YOUR_S3_REGION',
});

const s3 = new AWS.S3();

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (socket) => {
  console.log('WebSocket connected.');

  // Initialize variables to keep track of the received data chunks
  let receivedChunks = [];
  let totalSize = 0;

  socket.on('message', (message) => {
    // Assuming that the message is a chunk of data in Blob format
    receivedChunks.push(message);
    totalSize += message.length;

    // You can set a threshold for chunk size and upload to S3 when it's reached
    const chunkSizeThreshold = 1024 * 1024; // 1MB

    if (totalSize >= chunkSizeThreshold) {
      uploadToS3(receivedChunks);
    }
  });

  socket.on('close', () => {
    if (receivedChunks.length > 0) {
      uploadToS3(receivedChunks);
    }
    console.log('WebSocket closed.');
  });

  function uploadToS3(chunks) {
    // Concatenate received chunks into a single buffer
    const dataBuffer = Buffer.concat(chunks);

    // Define a unique key for the S3 object (e.g., a timestamp-based key)
    const s3ObjectKey = `uploads/${Date.now()}.blob`;

    // Upload the data to S3 using multipart upload
    s3.createMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
      },
      (err, uploadData) => {
        if (err) {
          console.error('Error creating S3 multipart upload:', err);
          return;
        }

        const partSize = 5 * 1024 * 1024; // 5MB part size (adjust as needed)
        const numParts = Math.ceil(dataBuffer.length / partSize);

        const uploadParts = [];

        for (let i = 0; i <   ; i++) {
          const start = i * partSize;
          const end = Math.min(start + partSize, dataBuffer.length);

          uploadParts.push(
            new Promise((resolve, reject) => {
              s3.uploadPart(
                {
                  Bucket: 'YOUR_BUCKET_NAME',
                  Key: s3ObjectKey,
                  PartNumber: i + 1,
                  UploadId: uploadData.UploadId,
                  Body: dataBuffer.slice(start, end),
                },
                (err, data) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve({ ETag: data.ETag, PartNumber: i + 1 });
                  }
                }
              );
            })
          );
        }

        Promise.all(uploadParts)
          .then((partsData) => {
            const uploadedParts = partsData.map((part) => ({
              ETag: part.ETag,
              PartNumber: part.PartNumber,
            }));

            s3.completeMultipartUpload(
              {
                Bucket: 'YOUR_BUCKET_NAME',
                Key: s3ObjectKey,
                UploadId: uploadData.UploadId,
                MultipartUpload: { Parts: uploadedParts },
              },
              (err, data) => {
                if (err) {
                  console.error('Error completing S3 multipart upload:', err);
                } else {
                  console.log('S3 multipart upload completed:', data.Location);
                }
              }
            );
          })
          .catch((err) => {
            console.error('Error uploading S3 parts:', err);
          });
      }
    );
  }
});



//// saving each chunk on aws 3 
const WebSocket = require('ws');
const AWS = require('aws-sdk');

// Set up AWS credentials and S3 instance
AWS.config.update({
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  region: 'YOUR_S3_REGION',
});

const s3 = new AWS.S3();

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (socket) => {
  console.log('WebSocket connected.');

  // Initialize variables to keep track of the received data chunks
  let totalSize = 0;
  let s3ObjectKey = null;
  let uploadId = null;
  let partNumber = 1;

  socket.on('message', (message) => {
    // Check if this is the first chunk, create a new S3 object
    if (s3ObjectKey === null) {
      s3ObjectKey = `uploads/${Date.now()}.blob`;
      createS3MultipartUpload();
    }

    // Assuming that the message is a chunk of data in Blob format
    const chunkBuffer = Buffer.from(message);
    totalSize += chunkBuffer.length;

    // Upload the chunk directly to S3
    uploadChunkToS3(chunkBuffer);
  });

  socket.on('close', () => {
    if (s3ObjectKey !== null) {
      completeS3MultipartUpload();
    }
    console.log('WebSocket closed.');
  });

  function createS3MultipartUpload() {
    s3.createMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
      },
      (err, data) => {
        if (err) {
          console.error('Error creating S3 multipart upload:', err);
        } else {
          uploadId = data.UploadId;
        }
      }
    );
  }

  function uploadChunkToS3(chunkBuffer) {
    s3.uploadPart(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
        PartNumber: partNumber,
        UploadId: uploadId,
        Body: chunkBuffer,
      },
      (err, data) => {
        if (err) {
          console.error('Error uploading S3 part:', err);
        } else {
          console.log(`Uploaded part ${partNumber}`);
          partNumber++;
        }
      }
    );
  }

  function completeS3MultipartUpload() {
    s3.completeMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
        UploadId: uploadId,
      },
      (err, data) => {
        if (err) {
          console.error('Error completing S3 multipart upload:', err);
        } else {
          console.log('S3 multipart upload completed:', data.Location);
        }
      }
    );
  }
});


// Compressing video which is on s3 bucket and saving it back on s3 in different folder 
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// AWS S3 credentials and configuration
const s3 = new AWS.S3({
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
});

const sourceBucket = 'your-source-bucket';
const sourceVideoKey = 'videos/video.mp4'; // Update with your video file path
const targetBucket = 'your-target-bucket';
const compressedVideoKey = 'compressed_video/compressed.mp4'; // Update with your target path

// Fetch video from S3
const fetchVideo = async () => {
  try {
    const response = await s3.getObject({ Bucket: sourceBucket, Key: sourceVideoKey }).promise();
    return response.Body;
  } catch (error) {
    console.error('Error fetching video from S3:', error);
    throw error;
  }
};

// Compress video using ffmpeg
const compressVideo = (videoBuffer) => {
  return new Promise((resolve, reject) => {
    const compressedStream = new ffmpeg()
      .input(videoBuffer)
      .outputOptions(['-vf', 'scale=640:-1', '-b:v', '1M'])
      .format('mp4')
      .on('end', () => {
        resolve(compressedStream.toBuffer());
      })
      .on('error', (err) => {
        reject(err);
      })
      .pipe();
  });
};

// Upload compressed video to S3
const uploadCompressedVideo = async (compressedBuffer) => {
  try {
    await s3
      .upload({
        Bucket: targetBucket,
        Key: compressedVideoKey,
        Body: compressedBuffer,
        ContentType: 'video/mp4',
      })
      .promise();

    console.log('Compressed video uploaded successfully!');
  } catch (error) {
    console.error('Error uploading compressed video to S3:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    const videoBuffer = await fetchVideo();
    const compressedBuffer = await compressVideo(videoBuffer);
    await uploadCompressedVideo(compressedBuffer);
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

main();


const express = require('express');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = 3000;

// Create a writable stream to store incoming video chunks
const videoStream = fs.createWriteStream('video.mp4');

// Start the FFmpeg process to create a live stream
const ffmpegProcess = ffmpeg()
  .input('video.mp4')
  .inputFormat('mp4')
  .outputOptions([
    '-f mpegts',    // Use MPEG-TS as the output format for streaming
    '-codec:v mpeg1video',  // Video codec for streaming
    '-s 640x480',   // Video resolution
    '-b:v 800k',    // Video bitrate
    '-bf 0',        // No B-frames for lower latency
    '-muxdelay 0.001',  // Low mux delay for real-time streaming
  ])
  .pipe();  // Pipe the FFmpeg output

ffmpegProcess.on('end', () => {
  console.log('FFmpeg process ended');
});

app.get('/stream', (req, res) => {
  // Set the response headers for streaming
  res.setHeader('Content-Type', 'video/MP2T');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Pipe the FFmpeg output to the HTTP response
  ffmpegProcess.pipe(res, { end: true });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// Handle incoming video chunks and write them to the videoStream
app.post('/upload', (req, res) => {
  req.pipe(videoStream);

  req.on('end', () => {
    res.status(200).send('Video chunk received and saved.');
  });
});

























server.on('connection', (socket) => {
  console.log('WebSocket connected.');

  let totalSize = 0;
  let s3ObjectKey = null;
  let uploadId = null;
  let partNumber = 1;
  const chunkSizeThreshold = 1024 * 1024; // 1MB

  // Initialize an array to accumulate chunks, adding data to it, whenever any new data is coming 
  let chunkAccumulator = [];

  socket.on('message', (message) => {
    if (s3ObjectKey === null) {
      s3ObjectKey = `uploads/${Date.now()}.blob`;
      // creating unique upload id 
      createS3MultipartUpload();
    }

    const chunkBuffer = Buffer.from(message);
    totalSize += chunkBuffer.length;

    // Accumulate chunks until the threshold is reached
    chunkAccumulator.push(chunkBuffer);

    // Check if the total size exceeds the threshold
    if (totalSize >= chunkSizeThreshold) {
      uploadChunksToS3();
    }
  });


  // creating unique upload id
  function createS3MultipartUpload() {
    s3.createMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
      },
      (err, data) => {
        if (err) {
          console.error('Error creating S3 multipart upload:', err);
        } else {
          uploadId = data.UploadId;
        }
      }
    );
  }

  function uploadChunksToS3() {
    const params = {
      Bucket: 'YOUR_BUCKET_NAME',
      Key: s3ObjectKey,
      PartNumber: partNumber,
      UploadId: uploadId,
    };

    // Combine accumulated chunks into a single buffer
    const combinedBuffer = Buffer.concat(chunkAccumulator);

    params.Body = combinedBuffer;

    s3.uploadPart(params, (err, data) => {
      if (err) {
        console.error('Error uploading S3 part:', err);
      } else {
        console.log(`Uploaded part ${partNumber}`);
        partNumber++;
        totalSize = 0; // Reset totalSize
        chunkAccumulator = []; // Clear the accumulator
      }
    });
  }



  socket.on('close', () => {
    if (s3ObjectKey !== null) {
      // Upload any remaining chunks when the WebSocket is closed
      uploadChunksToS3();
      completeS3MultipartUpload();
    }
    console.log('WebSocket closed.');
  });

 



  function completeS3MultipartUpload() {
    s3.completeMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
        UploadId: uploadId,
      },
      (err, data) => {
        if (err) {
          console.error('Error completing S3 multipart upload:', err);
        } else {
          console.log('S3 multipart upload completed:', data.Location);
        }
      }
    );
  }
});




// Approach for multiple users 
const WebSocket = require('ws');
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  region: 'YOUR_S3_REGION',
});

const s3 = new AWS.S3();
const server = new WebSocket.Server({ port: 8080 });

const activeUploads = {}; // Store active uploads by socket ID

server.on('connection', (socket) => {
  console.log('WebSocket connected.');

  let totalSize = 0;
  let s3ObjectKey = null;
  let uploadId = null;
  let partNumber = 1;
  const chunkSizeThreshold = 1024 * 1024; // 1MB

  // Initialize an array to accumulate chunks
  let chunkAccumulator = [];

  const socketId = socket._socket.remoteAddress + ':' + socket._socket.remotePort;

  socket.on('message', (message) => {
    if (s3ObjectKey === null) {
      // Create a unique file name based on socket ID and timestamp
      s3ObjectKey = `uploads/${socketId}_${Date.now()}.blob`;
      createS3MultipartUpload();
    }

    const chunkBuffer = Buffer.from(message);
    totalSize += chunkBuffer.length;

    chunkAccumulator.push(chunkBuffer);

    if (totalSize >= chunkSizeThreshold) {
      uploadChunksToS3();
    }
  });

  socket.on('close', () => {
    if (s3ObjectKey !== null) {
      uploadChunksToS3();
      completeS3MultipartUpload();
    }
    console.log('WebSocket closed.');
    // Remove the entry for this socket from active uploads
    delete activeUploads[socketId];
  });

  function createS3MultipartUpload() {
    s3.createMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
      },
      (err, data) => {
        if (err) {
          console.error('Error creating S3 multipart upload:', err);
        } else {
          uploadId = data.UploadId;
          // Store the active upload information
          activeUploads[socketId] = { s3ObjectKey, uploadId };
        }
      }
    );
  }

  function uploadChunksToS3() {
    const params = {
      Bucket: 'YOUR_BUCKET_NAME',
      Key: s3ObjectKey,
      PartNumber: partNumber,
      UploadId: uploadId,
    };

    const combinedBuffer = Buffer.concat(chunkAccumulator);

    params.Body = combinedBuffer;

    s3.uploadPart(params, (err, data) => {
      if (err) {
        console.error('Error uploading S3 part:', err);
      } else {
        console.log(`Uploaded part ${partNumber}`);
        partNumber++;
        totalSize = 0;
        chunkAccumulator = [];
      }
    });
  }

  function completeS3MultipartUpload() {
    s3.completeMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
        UploadId: uploadId,
      },
      (err, data) => {
        if (err) {
          console.error('Error completing S3 multipart upload:', err);
        } else {
          console.log('S3 multipart upload completed:', data.Location);
        }
      }
    );
  }
});

















const WebSocket = require('ws');
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  region: 'YOUR_S3_REGION',
});

const s3 = new AWS.S3();
const server = new WebSocket.Server({ port: 8080 });

const activeUploads = new Map(); // Store active uploads using a Map

server.on('connection', (socket) => {
  console.log('WebSocket connected.');

  let totalSize = 0;
  let s3ObjectKey = null;
  let uploadId = null;
  let partNumber = 1;
  const chunkSizeThreshold = 1024 * 1024; // 1MB

  // Initialize an array to accumulate chunks for each user
  const chunkAccumulators = new Map(); // Use a Map to associate chunks with users

  const socketId = socket._socket.remoteAddress + ':' + socket._socket.remotePort;

  socket.on('message', (message) => {
    if (s3ObjectKey === null) {
      // Create a unique file name based on socket ID and timestamp
      s3ObjectKey = `uploads/${socketId}_${Date.now()}.blob`;
      createS3MultipartUpload();
    }

    const chunkBuffer = Buffer.from(message);
    totalSize += chunkBuffer.length;

    // Check if the user has an accumulator, create one if not
    if (!chunkAccumulators.has(socketId)) {
      chunkAccumulators.set(socketId, []);
    }

    // Accumulate chunks for the user
    chunkAccumulators.get(socketId).push(chunkBuffer);

    if (totalSize >= chunkSizeThreshold) {
      uploadChunksToS3();
    }
  });

  socket.on('close', () => {
    if (s3ObjectKey !== null) {
      uploadChunksToS3();
      completeS3MultipartUpload();
    }
    console.log('WebSocket closed.');

    // Remove the entry for this socket from active uploads
    activeUploads.delete(socketId);
  });

  function createS3MultipartUpload() {
    s3.createMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
      },
      (err, data) => {
        if (err) {
          console.error('Error creating S3 multipart upload:', err);
        } else {
          uploadId = data.UploadId;
          // Store the active upload information
          activeUploads.set(socketId, { s3ObjectKey, uploadId });
        }
      }
    );
  }

  function uploadChunksToS3() {
    const params = {
      Bucket: 'YOUR_BUCKET_NAME',
      Key: s3ObjectKey,
      PartNumber: partNumber,
      UploadId: uploadId,
    };

    const combinedBuffer = Buffer.concat(chunkAccumulators.get(socketId));

    params.Body = combinedBuffer;

    s3.uploadPart(params, (err, data) => {
      if (err) {
        console.error('Error uploading S3 part:', err);
      } else {
        console.log(`Uploaded part ${partNumber}`);
        partNumber++;
        totalSize = 0;
        // Clear the accumulator for the user
        chunkAccumulators.get(socketId).length = 0;
      }
    });
  }

  function completeS3MultipartUpload() {
    s3.completeMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
        UploadId: uploadId,
      },
      (err, data) => {













const WebSocket = require('ws');
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  region: 'YOUR_S3_REGION',
});

const s3 = new AWS.S3();
const server = new WebSocket.Server({ port: 8080 });

const activeUploads = new Map(); // Store active uploads using a Map

server.on('connection', (socket) => {
  console.log('WebSocket connected.');

  const socketId = socket._socket.remoteAddress + ':' + socket._socket.remotePort;

  // Initialize separate state variables for each user
  let totalSize = 0;
  let s3ObjectKey = null;
  let uploadId = null;
  let partNumber = 1;

  // Initialize an array to accumulate chunks for each user
  const chunkAccumulators = new Map(); // Use a Map to associate chunks with users

  socket.on('message', (message) => {
    if (s3ObjectKey === null) {
      // Create a unique file name based on socket ID and timestamp
      s3ObjectKey = `uploads/${socketId}_${Date.now()}.blob`;
      createS3MultipartUpload();
    }

    const chunkBuffer = Buffer.from(message);
    totalSize += chunkBuffer.length;

    // Check if the user has an accumulator, create one if not
    if (!chunkAccumulators.has(socketId)) {
      chunkAccumulators.set(socketId, []);
    }

    // Accumulate chunks for the user
    chunkAccumulators.get(socketId).push(chunkBuffer);

    if (totalSize >= chunkSizeThreshold) {
      uploadChunksToS3();
    }
  });

  socket.on('close', () => {
    if (s3ObjectKey !== null) {
      uploadChunksToS3();
      completeS3MultipartUpload();
    }
    console.log('WebSocket closed.');

    // Remove the entry for this socket from active uploads
    activeUploads.delete(socketId);
  });

  function createS3MultipartUpload() {
    s3.createMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
      },
      (err, data) => {
        if (err) {
          console.error('Error creating S3 multipart upload:', err);
        } else {
          uploadId = data.UploadId;
          // Store the active upload information
          activeUploads.set(socketId, { s3ObjectKey, uploadId });
        }
      }
    );
  }

  function uploadChunksToS3() {
    const params = {
      Bucket: 'YOUR_BUCKET_NAME',
      Key: s3ObjectKey,
      PartNumber: partNumber,
      UploadId: uploadId,
    };

    const combinedBuffer = Buffer.concat(chunkAccumulators.get(socketId));

    params.Body = combinedBuffer;

    s3.uploadPart(params, (err, data) => {
      if (err) {
        console.error('Error uploading S3 part:', err);
      } else {
        console.log(`Uploaded part ${partNumber}`);
        partNumber++;
        totalSize = 0;
        // Clear the accumulator for the user
        chunkAccumulators.get(socketId).length = 0;
      }
    });
  }

  function completeS3MultipartUpload() {
    s3.completeMultipartUpload(
      {
        Bucket: 'YOUR_BUCKET_NAME',
        Key: s3ObjectKey,
        UploadId: uploadId,
      },
      (err, data) => {
        if (err) {
          console.error('Error completing S3 multipart upload:', err);
        } else {
          console.log('S3 multipart upload completed:', data.Location);
        }
      }
    );
  }


});


const { spawn } = require('child_process');
const fs = require('fs');

const combinedBuffer = Buffer.concat(chunkAccumulators.get(socketId));

// Specify the output file path
const outputPath = 'output.mp4';

// Create a write stream for the output file
const outputStream = fs.createWriteStream(outputPath);

// Use FFmpeg to convert the binary data to a video file
const ffmpeg = spawn('ffmpeg', [
  '-f', 'rawvideo',
  '-pix_fmt', 'rgb24',
  '-s', '640x480', // Adjust the resolution as needed
  '-r', '30',      // Adjust the frame rate as needed
  '-i', 'pipe:0',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  outputPath,
]);

ffmpeg.stdin.write(combinedBuffer);
ffmpeg.stdin.end();

ffmpeg.on('close', (code) => {
  if (code === 0) {
    console.log('Video conversion successful.');
    // At this point, outputPath contains the video file
  } else {
    console.error('Video conversion failed.');
  }
});

const params = {
  Bucket: 'your-bucket-name',
  Key: 'your-video-file.mp4',
  Body: fs.createReadStream(outputPath),
  ContentType: 'video/mp4', // Set the correct content type here
};

s3.upload(params, (err, data) => {
  if (err) {
    console.error('S3 Upload Error:', err);
  } else {
    console.log('File uploaded to S3:', data.Location);
    // You can also delete the local video file if needed
    fs.unlinkSync(outputPath);
  }
});


// Generate a filename for the `.flv` version
var flvFileName = fileName.substring(0, fileName.length - path.extname(fileName).length) + '.flv';

// Perform transcoding, save new video to new file name
var format = ffmpeg(data)
    .size('854x480')
    .videoCodec('libx264')
    .format('flv')
    .toFormat('mp4');
    .output(flvFileName)
    .on('end', function () {
        // Provide `ReadableStream` of new video as `Body` for `pubObject`
        var params = {
             Body: fs.createReadStream(flvFileName)
             Bucket: process.env.TRANSCODED_BUCKET,
             Key: flvFileName
        };

        s3.putObject(params, function (err, data) {

        });
    })


// Generate a filename for the `.flv` version
var flvFileName = fileName.substring(0, fileName.length - path.extname(fileName).length) + '.flv';

// Perform transcoding, save new video to new file name
var format = ffmpeg(data)
    .size('854x480')
    .videoCodec('libx264')
    .format('flv')
    .toFormat('mp4');
    .output(flvFileName)
    .on('end', function () {
        // Provide `ReadableStream` of new video as `Body` for `pubObject`
        var params = {
             Body: fs.createReadStream(flvFileName)
             Bucket: process.env.TRANSCODED_BUCKET,
             Key: flvFileName
        };

        s3.putObject(params, function (err, data) {

        });
    })

    const ffmpeg = require('fluent-ffmpeg');
    const fs = require('fs');
    
    // Replace 'inputBuffer' with your actual Buffer containing video data
    const inputBuffer = combinedBuffer; // Your accumulated video data in a Buffer
    const outputFilePath = 'output.mp4'; // Output .mp4 file path
    
    // Create a readable stream from the input Buffer
    const inputStream = new require('stream').Readable();
    inputStream.push(inputBuffer);
    inputStream.push(null);
    
    // Define FFmpeg command to convert the stream to an .mp4 file
    ffmpeg()
      .input(inputStream)
      .inputFormat('webm') // Specify the input format if needed (e.g., webm)
      .toFormat('mp4') // Specify the output format as .mp4
      .output(outputFilePath) // Specify the output file path
      .on('end', () => {
        console.log('Conversion finished');
      })
      .on('error', (err) => {
        console.error('Error:', err);
      })
      .run();
    

      const fs = require('fs');
      const AWS = require('aws-sdk');
      const { PassThrough } = require('stream');
      
      // Initialize AWS S3 SDK
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      });
      
      // Assuming you already have `combinedBuffer` containing the binary data
      
      // Create a writable stream to write the binary data to a temporary file
      const tempFilePath = '/path/to/temporary/file/tempVideo.mp4'; // Change this to your desired temporary file path
      const writeStream = fs.createWriteStream(tempFilePath);
      writeStream.write(combinedBuffer);
      writeStream.end();
      
      // Create a readable stream from the temporary file
      const readStream = fs.createReadStream(tempFilePath);
      
      // Create a PassThrough stream to pipe data to S3 multipart upload
      const passThrough = new PassThrough();
      
      // Pipe data from read stream to S3 upload stream
      readStream.pipe(passThrough);
      
      // S3 upload parameters
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: userObject.s3ObjectKey,
        PartNumber: userObject.partNumber,
        UploadId: userObject.uploadId,
        Body: passThrough, // Use the PassThrough stream as the Body
      };
      
      // Initiate S3 multipart upload
      s3.uploadPart(params, (err, data) => {
        if (err) {
          console.error('S3 uploadPart error:', err);
        } else {
          console.log('S3 uploadPart successful:', data);
        }
      
        // Clean up: remove the temporary file
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting temporary file:', unlinkErr);
          } else {
            console.log('Temporary file deleted.');
          }
        });
      });
      


      
// compress file

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const inputVideoStream = fs.createReadStream('path/to/downloaded/video.mp4'); // Replace with the path to the downloaded file
const outputVideoStream = fs.createWriteStream('path/to/output/compressed.mp4');

ffmpeg(inputVideoStream)
  .inputFormat('mp4') // Specify the input format if necessary
  .output(outputVideoStream)
  .on('end', () => {
    console.log('Compression finished.');
    // Proceed to upload the compressed file to S3.
  })
  .on('error', (err) => {
    console.error('Error during compression:', err);
  })
  .run();

/// upload file 

const compressedFileKey = 'path/to/compressed/file.mp4'; // The key for the compressed file in S3

const uploadParams = {
  Bucket: 'your-bucket-name',
  Key: compressedFileKey,
  Body: fs.createReadStream('path/to/output/compressed.mp4'), // Path to the compressed file
};

s3.upload(uploadParams, (err, data) => {
  if (err) {
    console.error('Error uploading compressed file to S3:', err);
  } else {
    console.log('Upload successful:', data.Location);
    // Clean up temporary files if needed.
  }
});


const file = path.join(inputVideoFolderPath, fileName);

try {
  const data = await new Promise((resolve, reject) => {
    s3Client.getObject(params, (err, data) => {
      if (err) {
        console.error('Error downloading file from S3:', err);
        reject(err);
      } else {
        const writableStream = fs.createWriteStream(file);
        writeDataToStream(writableStream, data.Body)
          .then(() => {
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
  const compressedFile = await applyCompression(file);

  // Continue with other operations as needed.
} catch (error) {
  // Handle any errors that occurred during the process.
  console.error('An error occurred:', error);
}

/// applying compression on s3 file in aws lambda function 
const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const { exec } = require('child_process');
const fs = require('fs');

exports.handler = async (event, context) => {
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  // Define a temporary file name for the compressed video
  const tempFileName = '/tmp/compressed-video.mp4';

  // Define FFmpeg command for compression
  const ffmpegCommand = `ffmpeg -i /tmp/input.mp4 -c:v libx264 -crf 23 -c:a aac -strict -2 /tmp/compressed-video.mp4`;

  // Download the source video file from S3 to the Lambda function's temporary directory
  try {
    const data = await S3.getObject({ Bucket: srcBucket, Key: srcKey }).promise();
    fs.writeFileSync('/tmp/input.mp4', data.Body);
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    return;
  }

  // Execute FFmpeg to compress the video
  exec(ffmpegCommand, async (error, stdout, stderr) => {
    if (error) {
      console.error('Error running FFmpeg:', error);
      return;
    }

    // Upload the compressed video back to the same S3 bucket
    try {
      const compressedData = fs.readFileSync(tempFileName);
      await S3.putObject({ Bucket: srcBucket, Key: srcKey, Body: compressedData }).promise();
      console.log('Compressed video uploaded successfully.');
    } catch (uploadError) {
      console.error('Error uploading compressed video to S3:', uploadError);
    }
  });
};


const express = require('express');
const app = express();

// Set up AWS SDK with your credentials
const AWS = require('aws-sdk');
AWS.config.update({ accessKeyId: 'YOUR_ACCESS_KEY', secretAccessKey: 'YOUR_SECRET_KEY' });

// Create an S3 instance
const s3 = new AWS.S3();

// Define a route to serve the video
app.get('/video', (req, res) => {
  const videoKey = 'YOUR_VIDEO_KEY_IN_S3'; // Replace with your S3 video key
  const cloudFrontURL = 'YOUR_CLOUDFRONT_URL'; // Replace with your CloudFront distribution URL

  const videoURL = `${cloudFrontURL}/${videoKey}`;

  // Redirect the user to the CloudFront URL
  res.redirect(videoURL);
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


const express = require('express');
const app = express();

// Set up AWS SDK with your credentials
const AWS = require('aws-sdk');
AWS.config.update({ accessKeyId: 'YOUR_ACCESS_KEY', secretAccessKey: 'YOUR_SECRET_KEY' });

// Create an S3 instance
const s3 = new AWS.S3();

// Define a route to serve the video
app.get('/video', (req, res) => {
  const videoKey = 'YOUR_VIDEO_KEY_IN_S3'; // Replace with your S3 video key
  const cloudFrontURL = 'YOUR_CLOUDFRONT_URL'; // Replace with your CloudFront distribution URL

  const videoURL = `${cloudFrontURL}/${videoKey}`;

  // Redirect the user to the CloudFront URL
  res.redirect(videoURL);
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



creating live video 
const ffmpeg = require('fluent-ffmpeg');
const stream = require('socket.io-stream');

// Inside your Socket.IO connection handler
socket.on('startStream', () => {
  const videoStream = ffmpeg()
    .inputOptions('-f rawvideo')
    .inputFormat('rawvideo')
    .inputFPS(30) // Adjust as needed
    .videoCodec('libx264')
    .audioCodec('aac')
    .outputOptions(['-preset ultrafast', '-tune zerolatency'])
    .format('flv')
    .pipe();

  stream(socket).emit('stream', videoStream);
});

//frontend 
const socket = io.connect('http://your-server-url:3000');

socket.on('stream', (stream) => {
  const videoElement = document.getElementById('video-player');
  videoElement.src = window.URL.createObjectURL(stream);
});

  

// Streaming live video using ffmpeg 
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Define the input video file path and output directory
const inputVideoPath = 'input.mp4';
const outputDirectory = 'output';

// Create the output directory if it doesn't exist
if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory);
}

// Set up a route for video streaming
app.get('/stream', (req, res) => {
  // Use fluent-ffmpeg to encode and stream the video
  const outputPath = path.join(outputDirectory, 'output.m3u8');
  ffmpeg()
    .input(inputVideoPath)
    .outputOptions([
      '-c:v h264',         // Video codec
      '-c:a aac',          // Audio codec
      '-f hls',            // HLS format
      '-hls_time 10',      // Segment duration in seconds
      '-hls_list_size 6',  // Number of segments in the playlist
    ])
    .output(outputPath)
    .on('end', () => {
      console.log('Video streaming has finished.');
    })
    .on('error', (err) => {
      console.error('Error:', err);
    })
    .run();

  // Set headers for streaming
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  const stream = fs.createReadStream(outputPath);
  stream.pipe(res);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// streaming using node-media-server 
const NodeMediaServer = require('node-media-server');

// Create a new Node Media Server instance
const config = {
  rtmp: {
    port: 1935, // RTMP port
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000, // HTTP port
    allow_origin: '*',
  },
};

const nms = new NodeMediaServer(config);

// Start the Node Media Server
nms.run();

console.log('Node Media Server is running on port 1935 (RTMP) and port 8000 (HTTP)');





























// encoding using ffmpeg and serving video using HLS 

const express = require('express');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = 3000;

// Define the WebRTC input stream URL (replace with your actual WebRTC stream URL)
const webrtcInputUrl = 'your_webrtc_stream_url';

// Define the output HLS stream URL
const hlsOutputUrl = 'http://localhost:3000/hls/stream.m3u8';

// Set up FFmpeg to transcode the WebRTC stream to HLS
const ffmpegCommand = ffmpeg()
  .input(webrtcInputUrl)
  .inputFormat('webm') // Adjust the input format as needed (e.g., 'vp8' for VP8 video codec)
  .output(hlsOutputUrl)
  .outputOptions([
    '-c:v h264',
    '-hls_time 2',      // Segment duration (in seconds)
    '-hls_list_size 6', // Number of segments to keep in the playlist
    '-hls_wrap 10'      // Wrap around the segment files
  ])
  .on('end', () => {
    console.log('FFmpeg transcoding finished.');
  })
  .on('error', (err) => {
    console.error('FFmpeg transcoding error:', err);
  });

// Start FFmpeg transcoding
ffmpegCommand.run();

// Serve the HLS stream
app.use('/hls', express.static('path_to_hls_directory'));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


const express = require('express');
const http = require('http');
const { Server } = require('node-rtsp-stream');

const app = express();
const server = http.createServer(app);

// Initialize RTSP server
const rtspServer = new Server({
  serverAddress: '0.0.0.0',
  serverPort: 8554,
  path: '/stream1',
});

// Handle video chunks from the frontend
app.post('/video', (req, res) => {
  // Handle incoming video chunks in the request and convert them to a Blob
  // You may need to use a middleware like "multer" to handle file uploads
  // Then, pass the Blob to the RTSP stream
  const videoBlob = req.body; // Replace this with your actual video handling logic
  rtspServer.write(videoBlob);
  res.sendStatus(200);
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});


const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const videoChunksDir = 'path_to_video_chunks_directory';

// WebSocket server
wss.on('connection', (socket) => {
  console.log('WebSocket client connected');

  // Listen for incoming video chunks
  socket.on('message', (chunk) => {
    // Process and save the received chunk to a file
    const chunkFileName = `${Date.now()}.ts`;
    const chunkFilePath = path.join(videoChunksDir, chunkFileName);

    fs.writeFile(chunkFilePath, chunk, (err) => {
      if (err) {
        console.error('Error saving chunk:', err);
      } else {
        console.log('Received and saved chunk:', chunkFileName);
      }
    });
  });
});

// Serve HLS manifest and segments
app.get('/stream.m3u8', (req, res) => {
  // Generate the HLS manifest file dynamically or serve a pre-generated one.
  const manifestPath = path.join(videoChunksDir, 'stream.m3u8');
  fs.createReadStream(manifestPath).pipe(res);
});

app.get('/video/:segment', (req, res) => {
  // Serve the requested video segment from the chunks directory.
  const segmentPath = path.join(videoChunksDir, req.params.segment);
  fs.createReadStream(segmentPath).pipe(res);
});

// Perform video segmentation using ffmpeg.
ffmpeg()
  .input('concat:' + fs.readdirSync(videoChunksDir).map(chunkFile => path.join(videoChunksDir, chunkFile)).join('|'))
  .outputOptions(['-hls_time 4', '-hls_flags delete_segments'])
  .output(path.join(videoChunksDir, 'stream.m3u8'))
  .on('end', () => {
    console.log('Video segmentation complete');
  })
  .run();

// Start the server
server.listen(3000, () => {
  console.log('Server is running on port 3000');
});


const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mediasoup = require('mediasoup');

// Create an Express server
const app = express();
const server = http.createServer(app);

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

// Set up mediasoup
const mediasoupWorker = await mediasoup.createWorker();
const mediasoupRouter = await mediasoupWorker.createRouter({ mediaCodecs: [{ kind: 'video', mimeType: 'video/VP8', clockRate: 90000 }] });

// Create a WebSocket connection handler
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Handle incoming video chunks from Flutter app
    // You will need to parse and process these chunks
  });

  ws.on('close', () => {
    // Handle WebSocket connection closing
  });
});

// Serve recorded video chunks for rewinding
app.use('/recordings', express.static('path/to/recordings'));

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});





// Web server with peers js 
const NodeMediaServer = require('node-media-server');

// Configure Node Media Server
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 60,
    ping_timeout: 30,
  },
  http: {
    port: 8000,
    mediaroot: './media',
    allow_origin: '*',
  },
  trans: {
    ffmpeg: '/path/to/ffmpeg',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
      },
    ],
  },
};

const nms = new NodeMediaServer(config);
nms.run();

// WebRTC broadcasting logic can be added here


// Using PeerJS on the web client
const Peer = require('peerjs');

// Connect to the Node.js server
const peer = new Peer('your-unique-id', {
  host: 'your-nodejs-server.com',
  port: 9000,
  path: '/peerjs',
});

peer.on('open', (id) => {
  // Once connected, you can start receiving the live stream from the Node.js server.
  const video = document.createElement('video');
  document.body.appendChild(video);

  const mediaConnection = peer.call('streamer-id', stream);
  mediaConnection.on('stream', (stream) => {
    video.srcObject = stream;
    video.play();
  });
});



const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Define a directory where you'll store the video chunks
const videoChunksDirectory = path.join(__dirname, 'video_chunks');

// Ensure the directory exists
if (!fs.existsSync(videoChunksDirectory)) {
  fs.mkdirSync(videoChunksDirectory);
}

// Handle WebSocket connections for receiving video chunks
wss.on('connection', (ws) => {
  // Generate a unique identifier for the client (you can use any method)
  const clientId = generateUniqueClientId();

  // Define a unique URL for this client's video stream
  const uniqueStreamUrl = `/stream/${clientId}`;

  ws.on('message', (message) => {
    // Handle incoming video chunks from the client
    // You can save and process these chunks as needed

    // For simplicity, let's assume you save the chunk to a file
    const chunkFilename = `${clientId}_${Date.now()}.webm`;
    const chunkFilePath = path.join(videoChunksDirectory, chunkFilename);
    fs.writeFileSync(chunkFilePath, message);

    // Now you can serve this chunk via a unique URL
  });

  ws.on('close', () => {
    // Handle WebSocket connection closing for cleanup
  });
});

// Define a route to serve the unique video stream for each client
app.get('/stream/:clientId', (req, res) => {
  const clientId = req.params.clientId;

  // Set appropriate headers for video streaming
  res.setHeader('Content-Type', 'video/webm');

  // Assuming you have a function to stream video chunks
  streamVideoChunks(clientId, res);
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

function generateUniqueClientId() {
  // Implement your logic to generate a unique client ID here
  // For example, you can use a UUID library or generate a random ID
  // Return the unique ID as a string
}

function streamVideoChunks(clientId, res) {
  // Implement your logic to stream video chunks to the response
  // You can read and send the chunks based on the clientId
  // You may need to read the chunks from the saved files and send them in a streaming fashion
  // Be sure to handle error cases and close the response when needed
}




import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const App = () => {
  const videoRef = useRef(null);
  const socketRef = useRef();

  useEffect(() => {
    // Create a new WebSocket connection to the signaling server
    socketRef.current = io('ws://localhost:3001');

    // Initialize WebRTC
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // Display the local video stream
        videoRef.current.srcObject = stream;

        // Create a WebRTC peer connection
        const peer = new SimplePeer({
          initiator: true, // You can set this to false for the receiving end
          trickle: false,
          stream: stream,
        });

        // Send the local stream to the signaling server
        peer.on('signal', (data) => {
          socketRef.current.emit('offer', data);
        });

        // Receive remote stream
        peer.on('stream', (remoteStream) => {
          videoRef.current.srcObject = remoteStream;
        });

        // Receive WebRTC offer from the signaling server
        socketRef.current.on('offer', (data) => {
          peer.signal(data);
        });
      })
      .catch((error) => {
        console.error('Error accessing user media:', error);
      });

    return () => {
      // Clean up when the component unmounts
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
};

export default App;


//// Backend in node js for peers js 
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store WebSocket connections for clients
const clients = new Set();

wss.on('connection', (ws) => {
  // Add the WebSocket connection to the set of clients
  clients.add(ws);

  ws.on('message', (message) => {
    // Broadcast the message to all connected clients except the sender
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  ws.on('close', () => {
    // Remove the WebSocket connection when a client disconnects
    clients.delete(ws);
  });
});

server.listen(3001, () => {
  console.log('Signaling server is listening on port 3001');
});

import React, { useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import io from 'socket.io-client';

const SenderApp = () => {
  const socketRef = useRef();
  const peerRef = useRef();

  useEffect(() => {
    socketRef.current = io('ws://localhost:3001');

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        peerRef.current = new SimplePeer({ initiator: true, stream });

        // Send local stream to the signaling server
        peerRef.current.on('signal', (data) => {
          socketRef.current.emit('offer', data);
        });

        // When a connection is established, you can start sending data
        peerRef.current.on('connect', () => {
          // Send data here, e.g., video chunks
        });

        // Handle incoming stream (not needed for the sender)
        peerRef.current.on('stream', (remoteStream) => {
          // Do something with remoteStream if needed
        });

        // Handle WebRTC signaling
        socketRef.current.on('offer', (data) => {
          peerRef.current.signal(data);
        });
      })
      .catch((error) => {
        console.error('Error accessing user media:', error);
      });

    return () => {
      // Clean up when the component unmounts
      socketRef.current.disconnect();
      peerRef.current.destroy();
    };
  }, []);

  return (
    <div>
      <h1>Sending Live Stream</h1>
      {/* You can add UI elements for the sender app here */}
    </div>
  );
};

export default SenderApp;

// Capturing video frame 
import React, { useState } from 'react';

function App() {
  const [imageData, setImageData] = useState(null);

  const captureImage = async () => {
    const video = document.getElementById('video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL('image/png');

    // Save the image locally (you can use localStorage or IndexedDB)
    setImageData(dataURL);

    // Send the image data to the server using WebSocket
    const socket = new WebSocket('ws://server-address');
    socket.onopen = () => {
      socket.send(dataURL);
    };
  };

  return (
    <div>
      <video id="video" autoPlay />
      <button onClick={captureImage}>Capture Image</button>
      {imageData && <img src={imageData} alt="Captured Image" />}
    </div>
  );
}

export default App;

// getting facial expression 
const { FaceMesh, FaceMeshFace } = require('@mediapipe/face_mesh');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function analyzeFaceExpression(imagePath) {
  const canvas = createCanvas(640, 480);
  const context = canvas.getContext('2d');

  // Load the image
  const image = await loadImage(imagePath);

  // Draw the image on the canvas
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Initialize the FaceMesh model
  const faceMesh = new FaceMesh();
  await faceMesh.initialize();

  // Process the image and get the face expressions
  const faces = await faceMesh.estimateFaces({ input: canvas });

  if (faces.length > 0) {
    // Extract face expressions for the first detected face
    const face = faces[0];
    const faceExpression = {
      smile: face.scaledMesh[13][1] - face.scaledMesh[14][1],
      leftEyeBlink: face.scaledMesh[159][1] - face.scaledMesh[145][1],
      rightEyeBlink: face.scaledMesh[386][1] - face.scaledMesh[374][1],
    };

    console.log('Face Expressions:', faceExpression);
  } else {
    console.log('No face detected in the image.');
  }
}

const imagePath = 'path_to_your_image.jpg'; // Replace with the path to your image
analyzeFaceExpression(imagePath);

// Training custom model 

const tf = require('@tensorflow/tfjs-node');

// Define your custom pose detection model architecture
const model = tf.sequential();
model.add(tf.layers.conv2d({ /* ... */ }));
model.add(tf.layers.flatten());
model.add(tf.layers.dense({ /* ... */ }));

// Compile the model
model.compile({
  optimizer: 'adam',
  loss: 'meanSquaredError',
  metrics: ['accuracy'],
});

// Load and preprocess your custom dataset
const { images, annotations } = loadCustomDataset('custom_dataset/');

// Train the model
model.fit(images, annotations, {
  epochs: 50,
  batchSize: 32,
  validationSplit: 0.2,
}).then((info) => {
  console.log('Training complete.');
  model.save('custom_pose_model');
});

// Use the trained model for inference on new images
const testImage = loadImage('new_image.jpg');
const keypoints = model.predict(testImage);
console.log('Predicted keypoints:', keypoints);


const captureAndSendFrame = () => {
  const videoElement = document.createElement('video');
  videoElement.srcObject = videoStream;

  videoElement.onloadedmetadata = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert the frame to a data URL (you can choose another format if needed)
    const frameDataUrl = canvas.toDataURL('image/jpeg');

    // Send the frame to the server
    socket.emit('sendFrame', frameDataUrl);
  };
};

// Jk252510@123



const http = require('http');
const socketServer = require('socket.io');

// Create an HTTP server
const httpServer = http.createServer((req, res) => {
  // Handle your HTTP requests here
});

// Initialize Socket.IO
const io = new socketServer(httpServer, {
  pingTimeout: 60000,
  // Other Socket.IO configuration options
});

// Define a function for server-side authentication
function authenticateClient(socket, token) {
  // Perform your authentication logic here, e.g., check the token against a database
  // If authentication succeeds, allow the connection
  if (validateToken(token)) {
    console.log('Client authenticated.');
    return true;
  }

  // If authentication fails, reject the connection
  console.log('Client authentication failed.');
  return false;
}

// Socket.IO event handler for new connections
io.on('connection', (socket) => {
  console.log('A client has connected.');

  // Extract the token from the client's handshake query
  const token = socket.handshake.query.token;

  // Perform server-side authentication
  if (authenticateClient(socket, token)) {
    // Authentication succeeded, you can proceed with further interaction
    // Here, you can handle events, emit messages, and so on
  } else {
    // Authentication failed, close the connection
    socket.disconnect(true);
  }
});

// Start the HTTP server
httpServer.listen(3000, () => {
  console.log('Server is running on port 3000');
});

// Helper function to validate the token (replace with your own logic)
function validateToken(token) {
  // Implement your token validation logic here, e.g., check against a database
  // Return true if the token is valid, false if it's not
  return token === 'your_secret_token';
}
