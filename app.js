// Adding required dependencies 
const express = require('express')
const http = require('http')
const socketIo = require('socket.io');
require('dotenv').config()
const PORT = process.env.PORT || 8001
var cors = require('cors')
const fs = require('fs');
const path = require('path')
const videoFolderPath = path.join(__dirname, 'public/videos');
const bodyParser = require('body-parser')
const {compressS3Video} = require('./services/compressVideo')
const AWS = require('aws-sdk'); 
const userRoutes = require("./routes/userRoutes")
const connectDb = require('./config/db')
connectDb()

const userCordinatemodel = require("./models/userCordinates")

// Creating s3 client 
const s3Client = new AWS.S3({
    region: 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  
});

// Inititating required packages 
const app = express()
app.use(cors());
app.use(bodyParser.json());

// Routes of app
app.use("/", userRoutes)

// Setting custom CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Replace * with  allowed origins
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});


const server = http.createServer(app);
const io = socketIo(server, {
    maxHttpBufferSize: 1e8,
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});



// maintaining socket connections
let connections  = {}
var chunkAccumulators = new Map(); // Using or Map to store data for each connection in respect of connectionId key
var drivers =   []


async function addNewOffer(connectionId, offer) {

    return new Promise((resolve, reject) => {
        if(drivers[connectionId]) 
            reject()

             const newUser = {   
                 conn: connectionId,
                 username: connectionId,
                 offer: offer
             }

        drivers[connectionId] = newUser 
        io.emit("new_offer_recieved", {data: offer})
        resolve(drivers)
    })
}

// Sending answer to the client
async function sendAnswer(answer) {
    setTimeout(() => {
        io.emit("answer_recieved", {data: answer})
    }, 1000);
}

async function sendCandidate(candidate) {
    io.emit("ice_candidate", {data: candidate})
}

async function sendPeertoAdmin(peer) {
    io.emit("get_peer", {data: peer})
}

try {
    io.on('connection', (socket) => { 

        socket.on("check_stream", async (data)=> {
             
            console.log("data.admin.check.atream", data.data);
            io.emit("check_state_admin", {data: data.data});
        })
        
        // Code for Web RTC peer to peer connections 
        socket.on("live_stream_data", async(data) => {  

            console.log("live_stream_data", data.type,);

            switch(data.type) {

                case "user_peer": 
                      console.log("New peer", data.peer);
                      await sendPeertoAdmin(data.peer)

                      break

                case "store_offer": 
                  
                    console.log("New offer", data.type);
                    const result = await addNewOffer(socket.id, data.offer)
                    break 

                case "answer":

                    // Recieving answer from the admin 
                    const answer = data.answer 
                    if(answer) {
                        await sendAnswer(data.answer)
                    }
                    break

                case "candidate": 
                    
                   const candidate = data.candidate 
                   if(candidate) {
                    await sendCandidate(candidate)
                   }
                   console.log("got candidate", data.candidate);
                   break;

            }
        })

        
        if(!connections.hasOwnProperty(socket.id) || connections[socket.id] == undefined) {
            connections[socket.id] = { totalSize: 0, s3ObjectKey:null, uploadId:null, partNumber:1, Etags: [], fileSize:0, isUploadinProgress: false, location:[] }
        }

        // user is connecting  Video file syncing code on s3
        console.log("User connected");
        console.log(connections[socket.id]);
        
        const chunkSizeThreshold = (1024 * 1024) *5; // 1MB
        socket.on("getLiveLocation", async(data) => {
            const newObject = {
                time: data.current_time,
                latitude: data.latitude,
                longitude: data.longitude,
                connectionId: socket.id
            }

            connections[socket.id].location.push(newObject)

            console.log("New object recieved -", connections[socket.id].location);
        })

        // Getting blob data 
        socket.on('getBlobData', async (data) => {

            // Creating file name 
            if(connections[socket.id].s3ObjectKey == null) {
                connections[socket.id].s3ObjectKey = socket.id+"_"+Date.now()+".mp4"
                connections[socket.id].uploadId = await createS3MultipartUploadId(connections[socket.id].s3ObjectKey)
            }

            const chunkBuffer = Buffer.from(data.data);
            connections[socket.id].totalSize += chunkBuffer.length;
            connections[socket.id].fileSize += chunkBuffer.length;
            
            // Check if the user has an accumulator, create one if not
            if (!chunkAccumulators.has(socket.id)) {
                chunkAccumulators.set(socket.id, []);
            }

            chunkAccumulators.get(socket.id).push(chunkBuffer);

            if(connections[socket.id].totalSize >= chunkSizeThreshold) {

                const currentObj = {...connections[socket.id]}
                const currentBuffer = Array.from(chunkAccumulators.get(socket.id))

                // connection state changes for specific user 
                connections[socket.id].isUploadinProgress = true
                connections[socket.id].partNumber++;
                connections[socket.id].totalSize = 0;
                chunkAccumulators.get(socket.id).length = 0;

                await uploadChunksToS3(currentObj, socket.id, currentBuffer);
            }
            
            // need to remove
            let blobBuffer = Buffer.from(data.data);
            let chunkSizeInKB = blobBuffer.length / 1024;

          
        })

        // Completing a stream 
        socket.on('completeStream',  async () => {

        
                try {
                    console.log('Complete stream function has callled');
                    if(connections.hasOwnProperty(socket.id)) {

                        if(connections[socket.id].isUploadinProgress) {

                            await waitForUpload(socket.id); 
                        }

                        console.log("No uploading is in progress");

                        if(connections[socket.id].totalSize > 0) {
                            const currentBuffer = chunkAccumulators.get(socket.id)
                            await uploadChunksToS3(connections[socket.id], socket.id, currentBuffer);
                        }

                        const response = await completeS3MultipartUpload(connections[socket.id])
                        const sizeInKB = connections[socket.id].fileSize/1024;
                        const sizeInMB = sizeInKB/1024

                        socket.emit("videoSize", {data: sizeInMB.toFixed(2)})
                        const socketId = socket.id

                        // compressVideo(fileName, socket.id) // Compressing local file
                        compressS3Video(connections[socketId].s3ObjectKey, socketId, io) // Compressing s3 file
                        connections[socketId] = undefined

                        
                    }
                } catch (error) {
                    console.log(error.message, "completing stream");
                }

        })

        // On disconnect of user
        socket.on('disconnect', async function () {
            console.log('user disconnected - '+socket.id);
            console.log(connections);

        });
    })

} catch (error) {
    console.log('error in connecting with socket'+error.message);
}

function waitForUpload(connectionId) {
    return new Promise((resolve) => {
      const checkCondition = () => {
        if (!connections[connectionId].isUploadinProgress) {
            console.log(connections[connectionId].isUploadinProgress, "if false");
          resolve(); 
        } else {
            console.log(connections[connectionId].isUploadinProgress, "if not");
          setTimeout(checkCondition, 1000); // Check again after 1 second
        }
      };
      checkCondition();
    });
  }


// Uploading chunk on server
async function uploadChunksToS3(userObject, socketId, currentBuffer) {

    console.log("............................................");
    console.log("Uploading chunk on s3 is called");
    console.log("Incoming data", userObject);
    console.log("Incoming buffer", currentBuffer);

    return new Promise((resolve, reject) => {
        try {
            const params = {
                Bucket: process.env.S3_BUCKET_NAME ,
                Key: userObject.s3ObjectKey,
                PartNumber: userObject.partNumber,
                UploadId: userObject.uploadId,
              };

              const combinedBuffer = Buffer.concat(currentBuffer);
              params.Body = combinedBuffer

              s3Client.uploadPart(params, (err, data) => {
                if (err) {
                    console.error('Error uploading S3 part:', err);
                reject(err)
                } else {
                    console.log("Chunk uploaded successfully");
                    connections[socketId].Etags.push({ETag: data.ETag, PartNumber: userObject.partNumber})
                    connections[socketId].isUploadinProgress = false
                    resolve(true)
                }
            });

        } catch (error) {
            reject(error)
            console.log(error.message, "Issue in uploadchunk function");
        }
    })
}

// Completing the file chunking 
function completeS3MultipartUpload(userObject) {
    console.log("Info inside completes3 multipart Upload");
    console.log(userObject.s3ObjectKey);
    console.log(userObject.uploadId);
    console.log("Etags", userObject.Etags);
    return new Promise((resolve, reject) => {
        try {
            s3Client.completeMultipartUpload(
                {
                  Bucket: process.env.S3_BUCKET_NAME ,
                  Key: userObject.s3ObjectKey,
                  UploadId: userObject.uploadId,
                  MultipartUpload : { Parts: userObject.Etags },
                },  
                (err, data) => {
                  if (err) {
                    console.error('Error completing S3 multipart upload:', err);
                    reject(err)
                  } else {
                    console.log('S3 multipart upload completed:', data.Location);
                    console.log(data);
                    resolve(data.Location)
                  }
                }
              );
        } catch (error) {
            console.log("Issue in completing the upload");
            reject(error)
        }
    })
  }

// Creating unique upload Id
function createS3MultipartUploadId(s3ObjectKey) {

    return new Promise((resolve, reject) => {
        try {
            s3Client.createMultipartUpload(
                {
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: s3ObjectKey,
                },
                (err, data) => {
                  if (err) {
                    console.error('Error creating S3 multipart upload:', err);
                    reject(err)
                  } else {
                    uploadId = data.UploadId;
                     console.log('upload id has been created - '+uploadId);
                     resolve(uploadId);
                  }
                }
              );
        } catch (error) {
            console.log("Not able to create uploadId");
            reject(error)
        }
    })
}


server.listen(PORT, () => {
    console.log(`Server is running on localhost::${PORT}`);
})




// Video Stream route
app.get("/video", (req, res)=> {

    try {

        const range = req.headers.range
        console.log(range, "range");
        console.log(range.replace('/\D/g', ""));
        if(!range) {
            res.status(413).json({
                message: "Please send a range"
            })
        }

        const videoPath = path.join(videoFolderPath, "DpuM46vXeK6ihWlOAAAB_1695721735222.mp4")
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
})


// Streaming s3 video 
app.get("/get/s3video", (req, res) => {

    try {
        const request = require('request'); 
        const videoUrl = "https://ride4h-poc.s3.ap-south-1.amazonaws.com/new__video.mp4"; 
        const headers = {
            Range: req.headers.range,
        };

        request({
            url: videoUrl,
            headers: headers,
        })
        .on('response', (s3Response) => {
            console.log(s3Response.statusCode);
            if (s3Response.statusCode === 206) {
                const range = req.headers.range
                const videoSize = parseInt(s3Response.headers['content-length'], 10);

                const CHUNK_SIZE = 10**6; // 1MB
                const start = Number(range.replace(/\D/g, ""));
                const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
                const contentLength = end - start + 1;

                const videoHeaders = {
                    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": contentLength,
                    "Content-Type": "video/mp4"
                };

                res.writeHead(206, videoHeaders);
                s3Response.pipe(res);
            } else {
                res.status(500).json({ message: "Failed to fetch video from S3" });
            }
        })
        .on('error', (err) => {
            console.error(err);
            res.status(500).json({ message: "Failed to fetch video from S3" });
        });
        
    } catch (error) {
        console.log('Getting trouble in running video from s3');
        console.log(error.message);
        return res.status(413).json({
            error: error.message
        })
    }
})

// Route for show live stream
app.get("/", (req, res) => {
    res.sendFile(__dirname+"/index.html")
})

