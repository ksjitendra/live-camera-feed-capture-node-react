// Adding required dependencies 
const express = require('express')
const http = require('http')
const socketIo = require('socket.io');
require('dotenv').config()
const PORT = process.env.PORT || 8001
var cors = require('cors')
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { Writable } = require('stream');
const path = require('path')
const videoFolderPath = path.join(__dirname, 'public/videos');
const bodyParser = require('body-parser')
var toBuffer = require('blob-to-buffer')
const {compressVideo,videoCompress, myEmitter} = require('./services/compressVideo')
const {uploadVideo} = require('./services/storeVideo')
const {streamVideo, getVideo} = require('./services/streamVideo')


// Inititating required packages 
const app = express()
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// maintaining socket connections
let connections  = {}


// Setting custom CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Replace * with your allowed origins
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

try {
    io.on('connection', (socket) => {  
        
        // user is connecting 
        console.log('user connected - '+socket.id);

        // Getting blob data 
        socket.on('getBlobData', async (data) =>{

            console.log(socket.id);
            let blobBuffer = Buffer.from(data.data);
            let chunkSizeInKB = blobBuffer.length / 1024;
            console.log('Data received from frontend:', chunkSizeInKB.toFixed(2));
            // console.log("Blob Size:"- data.data.length);

            // Creating unique filename using socket.id and timepstamp
            const fileName = socket.id+"_"+Date.now()+".mp4"

            if(!connections.hasOwnProperty(socket.id)) {
                connections[socket.id] = fileName
            } else {
                if(connections[socket.id] == undefined) {
                    connections[socket.id] = fileName
                }
            }

            const file = connections[socket.id]
            const filePath = path.join(videoFolderPath, file);
            const writableStream = fs.createWriteStream(filePath, { flags: 'a' });
            writableStream.write(data.data);

        })

        // Completing a stream 
        socket.on('completeStream',  async () => {

            setTimeout(() => {
                try {
                    console.log('Complete stream function has callled');
                    if(connections.hasOwnProperty(socket.id)) {
                        const fileName = connections[socket.id] 
                        const filePath = path.join(videoFolderPath, fileName);

                        // getting file size 
                        fs.stat(filePath, (err, stats) => {
                            if (err) {
                              console.error(`Error reading file: ${err}`);
                            } else {
                              const fileSizeInBytes = stats.size;
                              const fileSizeInKilobytes = fileSizeInBytes / 1024;
                              const fileSizeInMegabytes = fileSizeInKilobytes / 1024;
                          
                              console.log(`File size in megabytes: ${fileSizeInMegabytes}`);
                              socket.emit("videoSize", {data: fileSizeInMegabytes.toFixed(2)})

                            }
                        });

                        // console.log('Size in fileSizeInMegabytes', fileSizeInMegabytes);
                        const socketId = socket.id
                        compressVideo(fileName, socket.id)
                        connections[socketId] = undefined
                    }
                    
                } catch (error) {
    
                    console.log(error.message, "completing stream");
                }
                
            }, 3000);
        })

        myEmitter.on('getCompressedSize', (data) => {
            // Emit a Socket.IO event based on the custom event
            console.log('called event in app.js', data.data);
            const fileSize = data.data
            socket.emit('compressVideoSize', {data: fileSize});
          });

        // On disconnect of user
        socket.on('disconnect', function () {
            console.log('user disconnected - '+socket.id);
        });
    })

} catch (error) {
    console.log('error in connecting with socket'+error.message);
}


server.listen(PORT, () => {
    console.log(`Server is running on localhost::${PORT}`);
})


app.get("/compress", videoCompress);
app.get("/save/video", uploadVideo); 
app.get('/videos', streamVideo )
app.get('/stream/:videoName', getVideo)

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
        // const videoPath = "https://ride4h-poc.s3.ap-south-1.amazonaws.com/videoplayback-1.mp4";
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

// main api 
app.get("/", (req, res) => {

    const arr = [1,2,3,4,5,6,7]
    res.sendFile(__dirname+"/index.html")
})

