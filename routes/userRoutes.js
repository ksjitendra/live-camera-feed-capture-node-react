const express = require('express')
const router = express.Router()
const { saveRecord }  = require("../controllers/saveCordinates")
const { videoCompress, compressS3Video } = require('../services/compressVideo')
const {uploadVideo} = require('../services/storeVideo')
const {streamVideo, getVideo} = require('../services/streamVideo')

router.get("/save/record", saveRecord)
router.get("/compress", videoCompress);
router.get("/save/video", uploadVideo); 
router.get('/videos', streamVideo );
router.get('/stream/:videoName', getVideo);
router.get('/compress/s3/video/:fileName', compressS3Video);

module.exports = router